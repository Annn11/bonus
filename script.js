const SIZE = 9;
const BOX = 3;
const EMPTY = 0;
const COL_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

let pivot = null;
let board = [];
let solution = [];
let fixedCells = [];
let selectedCell = null;
let moves = 0;
let mistakes = 0;
let hints = 0;
let solved = false;
let lastCheckWrong = new Set();
let lastCheckCorrect = new Set();

const movesEl = document.getElementById("movesCount");
const mistakesEl = document.getElementById("mistakesCount");
const hintsEl = document.getElementById("hintsCount");
const statusEl = document.getElementById("gameStatus");
const rowSelect = document.getElementById("rowSelect");
const colSelect = document.getElementById("colSelect");
const selectedCellText = document.getElementById("selectedCellText");

window.addEventListener("load", () => {
  bindControls();
  startNewGame();
});

function bindControls() {
  document.querySelectorAll("[data-number]").forEach((button) => {
    button.addEventListener("click", () => placeNumber(Number(button.dataset.number)));
  });

  document.getElementById("selectCellBtn").addEventListener("click", selectCellFromControls);
  rowSelect.addEventListener("change", previewSelectedFromControls);
  colSelect.addEventListener("change", previewSelectedFromControls);

  document.getElementById("eraseBtn").addEventListener("click", eraseSelectedCell);
  document.getElementById("checkBtn").addEventListener("click", checkBoard);
  document.getElementById("hintBtn").addEventListener("click", giveHint);
  document.getElementById("newGameBtn").addEventListener("click", startNewGame);
}


function selectCellFromControls() {
  if (solved) return;
  const row = Number(rowSelect.value);
  const col = Number(colSelect.value);
  selectCell(row, col);
}

function previewSelectedFromControls() {
  if (selectedCell) return;
  const row = Number(rowSelect.value) + 1;
  const col = COL_NAMES[Number(colSelect.value)];
  setStatus(`Для вибору натисніть «Обрати клітинку»: рядок ${row}, стовпець ${col}`);
}

function updateSelectedCellText() {
  if (!selectedCell) {
    selectedCellText.textContent = "не обрана";
    return;
  }

  selectedCellText.textContent = `рядок ${selectedCell.row + 1}, стовпець ${COL_NAMES[selectedCell.col]}`;
  rowSelect.value = String(selectedCell.row);
  colSelect.value = String(selectedCell.col);
}

function startNewGame() {
  solution = generateFullSolution();
  board = makePuzzle(solution, 46);
  fixedCells = board.map((row) => row.map((value) => value !== EMPTY));
  selectedCell = null;
  moves = 0;
  mistakes = 0;
  hints = 0;
  solved = false;
  lastCheckWrong.clear();
  lastCheckCorrect.clear();
  updateScoreboard();
  setStatus("Оберіть клітинку");
  updateSelectedCellText();
  renderWebDataRocksTable();
}

function generateFullSolution() {
  const grid = createEmptyGrid();
  fillGrid(grid);
  return grid;
}

function createEmptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

function fillGrid(grid) {
  const empty = findEmptyCell(grid);
  if (!empty) return true;

  const [row, col] = empty;
  const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  for (const number of numbers) {
    if (canPlace(grid, row, col, number)) {
      grid[row][col] = number;
      if (fillGrid(grid)) return true;
      grid[row][col] = EMPTY;
    }
  }

  return false;
}

function findEmptyCell(grid) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (grid[row][col] === EMPTY) return [row, col];
    }
  }
  return null;
}

function canPlace(grid, row, col, number) {
  for (let i = 0; i < SIZE; i += 1) {
    if (grid[row][i] === number || grid[i][col] === number) return false;
  }

  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;

  for (let r = boxRow; r < boxRow + BOX; r += 1) {
    for (let c = boxCol; c < boxCol + BOX; c += 1) {
      if (grid[r][c] === number) return false;
    }
  }

  return true;
}

function makePuzzle(fullSolution, emptyCellsCount) {
  const puzzle = fullSolution.map((row) => [...row]);
  const cells = [];

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      cells.push([row, col]);
    }
  }

  shuffle(cells).slice(0, emptyCellsCount).forEach(([row, col]) => {
    puzzle[row][col] = EMPTY;
  });

  return puzzle;
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function boardToWebDataRocksRows() {
  return board.map((row, rowIndex) => {
    const item = { "Рядок": rowIndex + 1 };
    row.forEach((value, colIndex) => {
      item[COL_NAMES[colIndex]] = value === EMPTY ? " " : String(value);
    });
    return item;
  });
}

function getReport() {
  return {
    dataSource: {
      data: boardToWebDataRocksRows()
    },
    options: {
      configuratorButton: false,
      grid: {
        type: "flat",
        showTotals: "off",
        showGrandTotals: "off"
      }
    },
    formats: [
      {
        name: "numbers",
        thousandsSeparator: " ",
        decimalPlaces: 0
      }
    ]
  };
}

function renderWebDataRocksTable() {
  if (!pivot) {
    pivot = new WebDataRocks({
      container: "#wdrTable",
      toolbar: false,
      width: "100%",
      height: 510,
      report: getReport(),
      reportcomplete: () => decorateWebDataRocksGrid()
    });

    pivot.on("aftergriddraw", decorateWebDataRocksGrid);
    return;
  }

  pivot.setReport(getReport());
  window.setTimeout(decorateWebDataRocksGrid, 80);
}

function decorateWebDataRocksGrid() {
  const container = document.getElementById("wdrTable");
  const rows = Array.from(container.querySelectorAll("tr"));
  const clickableCells = [];

  rows.forEach((rowElement) => {
    const cells = Array.from(rowElement.children);
    if (cells.length < 10) return;

    const rowNumber = Number(cells[0].innerText.trim());

    if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > 9) {
      cells.forEach((cell) => cell.classList.add("sudoku-header-cell"));
      return;
    }

    cells[0].classList.add("sudoku-row-label");

    for (let col = 0; col < SIZE; col += 1) {
      const cellElement = cells[col + 1];
      if (!cellElement) continue;

      const row = rowNumber - 1;
      const key = cellKey(row, col);

      cellElement.classList.add("sudoku-value-cell");
      cellElement.dataset.row = String(row);
      cellElement.dataset.col = String(col);
      cellElement.style.cursor = "pointer";

      const displayValue = board[row][col] === EMPTY ? "" : String(board[row][col]);
      cellElement.innerHTML = `<div class="sudoku-cell-content">${displayValue || ""}</div>`;
      if (cellElement.innerText.trim().toLowerCase() === "blank" || cellElement.innerText.trim().toLowerCase() === "(blank)") {
        cellElement.innerHTML = `<div class="sudoku-cell-content"></div>`;
      }

      if (fixedCells[row]?.[col]) cellElement.classList.add("sudoku-fixed");
      if (selectedCell && selectedCell.row === row && selectedCell.col === col) cellElement.classList.add("sudoku-selected");
      if ((col + 1) % 3 === 0 && col !== 8) cellElement.classList.add("sudoku-border-right");
      if ((row + 1) % 3 === 0 && row !== 8) cellElement.classList.add("sudoku-border-bottom");
      if (lastCheckWrong.has(key)) cellElement.classList.add("sudoku-wrong");
      if (lastCheckCorrect.has(key)) cellElement.classList.add("sudoku-correct");

      cellElement.onclick = () => selectCell(row, col);
      cellElement.onpointerdown = (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectCell(row, col);
      };

      clickableCells.push({ element: cellElement, row, col });
    }
  });

  buildClickOverlay(clickableCells);
  buildSubgridOverlay(clickableCells);
}

function buildClickOverlay(clickableCells) {
  const container = document.getElementById("wdrTable");
  let overlay = document.getElementById("sudokuClickOverlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "sudokuClickOverlay";
    container.appendChild(overlay);
  }

  overlay.innerHTML = "";

  if (clickableCells.length !== SIZE * SIZE) {
    overlay.style.display = "none";
    return;
  }

  overlay.style.display = "block";
  const containerBox = container.getBoundingClientRect();

  clickableCells.forEach(({ element, row, col }) => {
    const box = element.getBoundingClientRect();
    const button = document.createElement("button");

    button.type = "button";
    button.className = "sudoku-click-cell";
    button.setAttribute("aria-label", `Рядок ${row + 1}, стовпець ${col + 1}`);
    button.style.left = `${box.left - containerBox.left + container.scrollLeft}px`;
    button.style.top = `${box.top - containerBox.top + container.scrollTop}px`;
    button.style.width = `${box.width}px`;
    button.style.height = `${box.height}px`;

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectCell(row, col);
    });

    overlay.appendChild(button);
  });
}

function buildSubgridOverlay(clickableCells) {
  const container = document.getElementById("wdrTable");
  let overlay = document.getElementById("sudokuVisualOverlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "sudokuVisualOverlay";
    container.appendChild(overlay);
  }

  overlay.innerHTML = "";

  if (clickableCells.length !== SIZE * SIZE) {
    overlay.style.display = "none";
    return;
  }

  overlay.style.display = "block";
  const containerBox = container.getBoundingClientRect();

  for (let startRow = 0; startRow < SIZE; startRow += BOX) {
    for (let startCol = 0; startCol < SIZE; startCol += BOX) {
      const topLeft = clickableCells.find((cell) => cell.row === startRow && cell.col === startCol);
      const bottomRight = clickableCells.find((cell) => cell.row === startRow + 2 && cell.col === startCol + 2);

      if (!topLeft || !bottomRight) continue;

      const topLeftBox = topLeft.element.getBoundingClientRect();
      const bottomRightBox = bottomRight.element.getBoundingClientRect();

      const block = document.createElement("div");
      block.className = "sudoku-subgrid-box";
      block.style.left = `${topLeftBox.left - containerBox.left + container.scrollLeft}px`;
      block.style.top = `${topLeftBox.top - containerBox.top + container.scrollTop}px`;
      block.style.width = `${bottomRightBox.right - topLeftBox.left}px`;
      block.style.height = `${bottomRightBox.bottom - topLeftBox.top}px`;
      overlay.appendChild(block);
    }
  }
}

function selectCell(row, col) {
  if (solved) return;

  selectedCell = { row, col };
  updateSelectedCellText();
  lastCheckWrong.clear();
  lastCheckCorrect.clear();

  if (fixedCells[row][col]) {
    setStatus("Це початкова клітинка, її не можна змінити");
  } else {
    setStatus(`Обрана клітинка: рядок ${row + 1}, стовпець ${col + 1}`);
  }

  decorateWebDataRocksGrid();
}

function placeNumber(number) {
  if (solved) return;
  if (!selectedCell) {
    setStatus("Спочатку оберіть клітинку через рядок/стовпець або натиском у таблиці", "error");
    return;
  }

  const { row, col } = selectedCell;

  if (fixedCells[row][col]) {
    setStatus("Початкові числа змінювати не можна", "error");
    return;
  }

  board[row][col] = number;
  moves += 1;
  lastCheckWrong.clear();
  lastCheckCorrect.clear();

  if (number !== solution[row][col]) {
    mistakes += 1;
    lastCheckWrong.add(cellKey(row, col));
    setStatus("Число не підходить. Спробуйте інше", "error");
  } else {
    lastCheckCorrect.add(cellKey(row, col));
    setStatus("Правильно");
  }

  updateScoreboard();
  renderWebDataRocksTable();
  checkVictorySilently();
}

function eraseSelectedCell() {
  if (solved) return;
  if (!selectedCell) {
    setStatus("Спочатку оберіть клітинку", "error");
    return;
  }

  const { row, col } = selectedCell;

  if (fixedCells[row][col]) {
    setStatus("Початкову клітинку стерти не можна", "error");
    return;
  }

  board[row][col] = EMPTY;
  moves += 1;
  lastCheckWrong.clear();
  lastCheckCorrect.clear();
  updateScoreboard();
  setStatus("Клітинку очищено");
  renderWebDataRocksTable();
}

function giveHint() {
  if (solved) return;

  let target = selectedCell;

  if (!target || fixedCells[target.row][target.col] || board[target.row][target.col] === solution[target.row][target.col]) {
    target = findFirstEmptyOrWrongCell();
  }

  if (!target) {
    setStatus("Усі клітинки вже заповнені. Натисніть перевірку");
    return;
  }

  board[target.row][target.col] = solution[target.row][target.col];
  selectedCell = target;
  updateSelectedCellText();
  hints += 1;
  moves += 1;
  lastCheckWrong.clear();
  lastCheckCorrect.clear();
  lastCheckCorrect.add(cellKey(target.row, target.col));
  updateScoreboard();
  setStatus(`Підказка додала число ${solution[target.row][target.col]}`);
  renderWebDataRocksTable();
  checkVictorySilently();
}

function findFirstEmptyOrWrongCell() {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (!fixedCells[row][col] && board[row][col] !== solution[row][col]) {
        return { row, col };
      }
    }
  }
  return null;
}

function checkBoard() {
  if (solved) return;

  lastCheckWrong.clear();
  lastCheckCorrect.clear();

  let hasEmpty = false;
  let hasWrong = false;

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] === EMPTY) {
        hasEmpty = true;
      } else if (board[row][col] !== solution[row][col]) {
        hasWrong = true;
        lastCheckWrong.add(cellKey(row, col));
      } else if (!fixedCells[row][col]) {
        lastCheckCorrect.add(cellKey(row, col));
      }
    }
  }

  if (!hasEmpty && !hasWrong) {
    winGame();
  } else if (hasWrong) {
    mistakes += 1;
    updateScoreboard();
    setStatus("Є помилки. Червоні клітинки треба виправити", "error");
  } else {
    setStatus("Помилок немає, але ще є порожні клітинки");
  }

  decorateWebDataRocksGrid();
}

function checkVictorySilently() {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] !== solution[row][col]) return;
    }
  }
  winGame();
}

function winGame() {
  solved = true;
  lastCheckWrong.clear();
  lastCheckCorrect.clear();
  setStatus(`Перемога! Судоку розв'язано за ${moves} ходів`, "win");
  decorateWebDataRocksGrid();
}

function updateScoreboard() {
  movesEl.textContent = String(moves);
  mistakesEl.textContent = String(mistakes);
  hintsEl.textContent = String(hints);
}

function setStatus(text, type = "normal") {
  statusEl.textContent = text;
  statusEl.classList.remove("win", "error");
  if (type === "win") statusEl.classList.add("win");
  if (type === "error") statusEl.classList.add("error");
}

function cellKey(row, col) {
  return `${row}-${col}`;
}
