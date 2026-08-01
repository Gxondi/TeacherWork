function todayText() {
  const now = new Date();
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}年${month}月${day}日 ${weekday}`;
}

function currentSchoolYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function schoolYears(count = 7, date = new Date()) {
  const current = currentSchoolYear(date);
  const startYear = Number(current.split('-')[0]);
  return Array.from({ length: count }, (_, index) => {
    const year = startYear - index;
    return `${year}-${year + 1}`;
  });
}

module.exports = {
  currentSchoolYear,
  schoolYears,
  todayText
};
