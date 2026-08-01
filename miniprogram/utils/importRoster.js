const IMPORT_FIELDS = [
  { key: 'studentNo', label: '学号', placeholder: '例如 A 或 1' },
  { key: 'name', label: '学生姓名', required: true, placeholder: '必填，例如 B 或 2' },
  { key: 'gender', label: '性别', placeholder: '例如 C 或 3' },
  { key: 'phone', label: '学生电话', placeholder: '例如 D 或 4' },
  { key: 'address', label: '家庭住址', placeholder: '例如 E 或 5' },
  { key: 'guardianName', label: '家长姓名', placeholder: '例如 F 或 6' },
  { key: 'guardianRelation', label: '关系', placeholder: '例如 G 或 7' },
  { key: 'guardianPhone', label: '家长电话', placeholder: '例如 H 或 8' }
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

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some((item) => item !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((item) => item !== '')) rows.push(row);
  return rows;
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

function defaultMapping() {
  return {
    studentNo: 'A',
    name: 'B',
    gender: 'C',
    phone: 'D',
    address: 'E',
    guardianName: 'F',
    guardianRelation: 'G',
    guardianPhone: 'H'
  };
}

module.exports = {
  IMPORT_FIELDS,
  buildStudentsFromRows,
  columnToIndex,
  defaultMapping,
  parseCsv
};
