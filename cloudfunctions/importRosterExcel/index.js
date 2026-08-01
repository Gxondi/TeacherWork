const cloud = require('wx-server-sdk');
const XLSX = require('xlsx');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const IMPORT_FIELDS = [
  { key: 'studentNo' },
  { key: 'name' },
  { key: 'gender' },
  { key: 'phone' },
  { key: 'address' },
  { key: 'guardianName' },
  { key: 'guardianRelation' },
  { key: 'guardianPhone' }
];

function columnToIndex(input) {
  const value = String(input || '').trim().toUpperCase();
  if (!value) return -1;
  if (/^\d+$/.test(value)) return Number(value) - 1;
  if (!/^[A-Z]+$/.test(value)) return -1;

  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = result * 26 + (value.charCodeAt(index) - 64);
  }
  return result - 1;
}

function buildStudentsFromRows(rows, mapping, startRow) {
  const startIndex = Math.max(0, Number(startRow || 1) - 1);
  const indexes = {};
  IMPORT_FIELDS.forEach((field) => {
    indexes[field.key] = columnToIndex(mapping[field.key]);
  });

  return rows.slice(startIndex)
    .map((row, rowIndex) => {
      const student = {
        id: `stu-import-${Date.now()}-${rowIndex}`,
        name: '',
        gender: '',
        studentNo: '',
        phone: '',
        address: '',
        guardianName: '',
        guardianRelation: '',
        guardianPhone: ''
      };

      IMPORT_FIELDS.forEach((field) => {
        const columnIndex = indexes[field.key];
        if (columnIndex >= 0) {
          student[field.key] = String(row[columnIndex] || '').trim();
        }
      });

      return student;
    })
    .filter((student) => student.name);
}

exports.main = async (event) => {
  if (!event.fileID) {
    return { students: [] };
  }

  const download = await cloud.downloadFile({
    fileID: event.fileID
  });
  const workbook = XLSX.read(download.fileContent, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { students: [] };
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    defval: ''
  });

  return {
    students: buildStudentsFromRows(rows, event.mapping || {}, event.startRow)
  };
};
