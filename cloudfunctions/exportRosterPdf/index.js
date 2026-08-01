const cloud = require('wx-server-sdk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const PDFDocument = require('pdfkit');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

function resolveChineseFont() {
  const candidates = [
    path.join(__dirname, 'fonts', 'NotoSansSC-Regular.otf'),
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc'
  ];
  return candidates.find((fontPath) => fs.existsSync(fontPath));
}

exports.main = async (event) => {
  const schoolYear = event.schoolYear || '';
  const students = Array.isArray(event.students) ? event.students : [];
  const fileName = `roster-${schoolYear || Date.now()}.pdf`;
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const fontPath = resolveChineseFont();

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    const stream = fs.createWriteStream(tempFilePath);

    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    if (fontPath) {
      doc.font(fontPath);
    }

    doc.fontSize(18).text(`${schoolYear} 花名册`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(9);

    const headers = ['学号', '学生', '性别', '学生电话', '家庭住址', '家长', '关系', '家长电话'];
    const widths = [46, 52, 34, 72, 120, 58, 42, 78];
    let y = doc.y;

    function drawRow(values, isHeader) {
      let x = doc.page.margins.left;
      const rowHeight = 24;
      values.forEach((value, index) => {
        doc.rect(x, y, widths[index], rowHeight).stroke('#d1d5db');
        doc.fillColor(isHeader ? '#111827' : '#374151')
          .fontSize(isHeader ? 9 : 8)
          .text(String(value || ''), x + 4, y + 7, {
            width: widths[index] - 8,
            height: rowHeight - 8,
            ellipsis: true
          });
        x += widths[index];
      });
      y += rowHeight;
      if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
        doc.addPage();
        if (fontPath) {
          doc.font(fontPath);
        }
        y = doc.page.margins.top;
      }
    }

    drawRow(headers, true);
    students.forEach((student) => {
      drawRow([
        student.studentNo,
        student.name,
        student.gender,
        student.phone,
        student.address,
        student.guardianName,
        student.guardianRelation,
        student.guardianPhone
      ], false);
    });

    doc.end();
  });

  const upload = await cloud.uploadFile({
    cloudPath: `exports/${fileName}`,
    fileContent: fs.createReadStream(tempFilePath)
  });

  return {
    fileID: upload.fileID
  };
};
