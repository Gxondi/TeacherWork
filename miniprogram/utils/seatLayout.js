function buildSeatLayout(rows, seatsPerColumn) {
  const seats = [];
  let labelIndex = 1;
  let gridCol = 1;

  seatsPerColumn.forEach((seatCount, groupIndex) => {
    for (let row = 1; row <= rows; row += 1) {
      for (let seatIndex = 1; seatIndex <= seatCount; seatIndex += 1) {
        seats.push({
          id: `seat-${groupIndex + 1}-${row}-${seatIndex}-${Date.now()}-${labelIndex}`,
          label: `${labelIndex}`,
          row,
          groupIndex,
          seatIndex,
          seatCount,
          gridCol: gridCol + seatIndex - 1,
          studentName: '',
          note: '',
          deleted: false,
          selected: false
        });
        labelIndex += 1;
      }
    }
    gridCol += seatCount + 1;
  });

  return seats.map((seat) => ({
    ...seat,
    aisleAfter: seat.seatIndex === seat.seatCount && seat.groupIndex < seatsPerColumn.length - 1
  }));
}

function makeSeats() {
  return buildSeatLayout(5, [2, 2, 2]);
}

function normalizeSeatLayout(seats) {
  const groupOffsets = {};
  const sortedGroups = [...new Set(seats.map((seat, index) => (
    typeof seat.groupIndex === 'number' ? seat.groupIndex : Math.floor((index % 6) / 2)
  )))].sort((first, second) => first - second);
  let nextGridCol = 1;

  sortedGroups.forEach((groupIndex) => {
    const groupSeats = seats.filter((seat, index) => (
      (typeof seat.groupIndex === 'number' ? seat.groupIndex : Math.floor((index % 6) / 2)) === groupIndex
    ));
    const seatCount = Math.max(...groupSeats.map((seat) => seat.seatCount || 2));
    groupOffsets[groupIndex] = nextGridCol;
    nextGridCol += seatCount + 1;
  });

  return seats.map((seat, index) => {
    const groupIndex = typeof seat.groupIndex === 'number' ? seat.groupIndex : Math.floor((index % 6) / 2);
    const seatIndex = seat.seatIndex || (index % 2) + 1;
    const seatCount = seat.seatCount || 2;
    return {
    id: seat.id || `seat-${index + 1}`,
    label: seat.label || `${index + 1}`,
    row: seat.row || Math.floor(index / 6) + 1,
    groupIndex,
    seatIndex,
    seatCount,
    gridCol: groupOffsets[groupIndex] + seatIndex - 1,
    aisleAfter: seatIndex === seatCount && groupIndex < sortedGroups[sortedGroups.length - 1],
    studentName: seat.studentName || '',
    note: seat.note || '',
    deleted: !!seat.deleted,
    selected: false
    };
  });
}

module.exports = {
  buildSeatLayout,
  makeSeats,
  normalizeSeatLayout
};
