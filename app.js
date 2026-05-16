const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LETTERS = ALPHABET.split("");

const ROTORS = {
  I:    { wiring: "EKMFLGDQVZNTOWYHXUSPAIBRCJ", notch: "Q" },
  II:   { wiring: "AJDKSIRUXBLHWTMCQGZNPYFVOE", notch: "E" },
  III:  { wiring: "BDFHJLCPRTXVZNYEIWGAKMUSQO", notch: "V" },
  IV:   { wiring: "ESOVPZJAYQUIRHXLNFTGKDCMWB", notch: "J" },
  V:    { wiring: "VZBRGITYUPSDNHLXAWMJQOFECK", notch: "Z" },
  VI:   { wiring: "JPGVOUMFYQBENHZRDKASXLICTW", notch: "ZM" },
  VII:  { wiring: "NZJHGRCXMYSWBOUFAIVLPEKQDT", notch: "ZM" },
  VIII: { wiring: "FKQHTLXOCBJSPDZRAMEWNIUYGV", notch: "ZM" }
};

const REFLECTOR_B = "YRUHQSLDPXNGOKMIEBFZCWVJAT";

const CABLE_COLORS = [
  "#ffc247", "#62d89a", "#7db8ff", "#ff8bd1", "#c6ff6b",
  "#9b8cff", "#ff9b63", "#8ff3ff", "#ff5e66", "#d8b36a"
];

const clickSoundBase = new Audio("audio/klick1.wav");
clickSoundBase.preload = "auto";
clickSoundBase.load();

const leftRotorSelect = document.getElementById("leftRotorSelect");
const middleRotorSelect = document.getElementById("middleRotorSelect");
const rightRotorSelect = document.getElementById("rightRotorSelect");

const leftWindow = document.getElementById("leftWindow");
const middleWindow = document.getElementById("middleWindow");
const rightWindow = document.getElementById("rightWindow");

const lampboard = document.getElementById("lampboard");
const keyboard = document.getElementById("keyboard");
const plugboard = document.getElementById("plugboard");
const plugSvg = document.getElementById("plugSvg");
const plugCount = document.getElementById("plugCount");

const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");

const playTextBtn = document.getElementById("playTextBtn");
const clearBtn = document.getElementById("clearBtn");
const resetBtn = document.getElementById("resetBtn");

let leftPos = 0;
let middlePos = 0;
let rightPos = 0;

let selectedPlug = null;
let plugPairs = [];
let running = false;

const lampNodes = {};
const keyNodes = {};
const plugNodes = {};

function indexOf(letter) {
  return ALPHABET.indexOf(letter);
}

function letterAt(index) {
  return ALPHABET[(index + 26) % 26];
}

function fillRotorSelect(select, defaultValue) {
  Object.keys(ROTORS).forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  select.value = defaultValue;
}

function buildMachine() {
  fillRotorSelect(leftRotorSelect, "I");
  fillRotorSelect(middleRotorSelect, "II");
  fillRotorSelect(rightRotorSelect, "III");

  LETTERS.forEach(letter => {
    const lamp = document.createElement("div");
    lamp.className = "lamp";
    lamp.textContent = letter;
    lamp.dataset.letter = letter;
    lampboard.appendChild(lamp);
    lampNodes[letter] = lamp;

    const key = document.createElement("button");
    key.className = "key";
    key.textContent = letter;
    key.dataset.letter = letter;
    key.addEventListener("click", () => pressLetter(letter));
    keyboard.appendChild(key);
    keyNodes[letter] = key;

    const plug = document.createElement("button");
    plug.className = "plug";
    plug.textContent = letter;
    plug.dataset.letter = letter;
    plug.addEventListener("click", () => handlePlugClick(letter));
    plugboard.appendChild(plug);
    plugNodes[letter] = plug;
  });

  [leftWindow, middleWindow, rightWindow].forEach((btn, index) => {
    btn.addEventListener("click", () => {
      if (index === 0) leftPos = (leftPos + 1) % 26;
      if (index === 1) middlePos = (middlePos + 1) % 26;
      if (index === 2) rightPos = (rightPos + 1) % 26;
      updateWindows();
    });
  });

  updateWindows();
}

function updateWindows() {
  leftWindow.textContent = letterAt(leftPos);
  middleWindow.textContent = letterAt(middlePos);
  rightWindow.textContent = letterAt(rightPos);
}

function resetPositions() {
  leftPos = 0;
  middlePos = 0;
  rightPos = 0;
  updateWindows();
}

function getRotorConfig() {
  return {
    left: ROTORS[leftRotorSelect.value],
    middle: ROTORS[middleRotorSelect.value],
    right: ROTORS[rightRotorSelect.value]
  };
}

function isRotorAtNotch(rotor, pos) {
  return rotor.notch.includes(letterAt(pos));
}

function stepRotors() {
  const cfg = getRotorConfig();

  const middleAtNotch = isRotorAtNotch(cfg.middle, middlePos);
  const rightAtNotch = isRotorAtNotch(cfg.right, rightPos);

  if (middleAtNotch) {
    leftPos = (leftPos + 1) % 26;
  }

  if (middleAtNotch || rightAtNotch) {
    middlePos = (middlePos + 1) % 26;
  }

  rightPos = (rightPos + 1) % 26;

  updateWindows();
}

function rotorForward(letterIndex, wiring, position) {
  const shifted = (letterIndex + position) % 26;
  const wiredLetter = wiring[shifted];
  return (indexOf(wiredLetter) - position + 26) % 26;
}

function rotorBackward(letterIndex, wiring, position) {
  const shifted = (letterIndex + position) % 26;
  const shiftedLetter = letterAt(shifted);
  const wiredIndex = wiring.indexOf(shiftedLetter);
  return (wiredIndex - position + 26) % 26;
}

function plugSwap(letter) {
  const pair = plugPairs.find(pair => pair.includes(letter));
  if (!pair) return letter;

  return pair[0] === letter ? pair[1] : pair[0];
}

function encodeLetter(letter) {
  stepRotors();

  const cfg = getRotorConfig();

  let current = plugSwap(letter);
  let i = indexOf(current);

  i = rotorForward(i, cfg.right.wiring, rightPos);
  i = rotorForward(i, cfg.middle.wiring, middlePos);
  i = rotorForward(i, cfg.left.wiring, leftPos);

  i = indexOf(REFLECTOR_B[i]);

  i = rotorBackward(i, cfg.left.wiring, leftPos);
  i = rotorBackward(i, cfg.middle.wiring, middlePos);
  i = rotorBackward(i, cfg.right.wiring, rightPos);

  current = letterAt(i);
  current = plugSwap(current);

  return current;
}

async function pressLetter(letter) {
  if (running) return;

  running = true;
  await typeOneLetter(letter);
  running = false;
}

async function typeOneLetter(letter) {
  if (!LETTERS.includes(letter)) {
    outputText.value += letter;
    return;
  }

  playClick();

  const key = keyNodes[letter];
  key.classList.add("down");

  const encoded = encodeLetter(letter);

  const lamp = lampNodes[encoded];
  lamp.classList.add("on");

  outputText.value += encoded;

  await wait(170);

  key.classList.remove("down");
  lamp.classList.remove("on");
}

async function playInputText() {
  if (running) return;

  running = true;
  setControlsDisabled(true);

  const text = inputText.value.toUpperCase();

  for (const char of text) {
    await typeOneLetter(char);
    await wait(90);
  }

  setControlsDisabled(false);
  running = false;
}

function setControlsDisabled(disabled) {
  playTextBtn.disabled = disabled;
  clearBtn.disabled = disabled;
  resetBtn.disabled = disabled;
  leftRotorSelect.disabled = disabled;
  middleRotorSelect.disabled = disabled;
  rightRotorSelect.disabled = disabled;

  Object.values(keyNodes).forEach(node => node.disabled = disabled);
  Object.values(plugNodes).forEach(node => node.disabled = disabled);
}

function playClick() {
  const sound = clickSoundBase.cloneNode(true);
  sound.volume = 0.8;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function handlePlugClick(letter) {
  const existing = plugPairs.find(pair => pair.includes(letter));

  if (existing) {
    plugPairs = plugPairs.filter(pair => pair !== existing);
    selectedPlug = null;
    renderPlugboard();
    return;
  }

  if (!selectedPlug) {
    selectedPlug = letter;
    renderPlugboard();
    return;
  }

  if (selectedPlug === letter) {
    selectedPlug = null;
    renderPlugboard();
    return;
  }

  if (plugPairs.length >= 10) {
    selectedPlug = null;
    renderPlugboard();
    return;
  }

  plugPairs.push([selectedPlug, letter]);
  selectedPlug = null;
  renderPlugboard();
}

function renderPlugboard() {
  Object.values(plugNodes).forEach(node => {
    node.classList.remove("selected", "connected");
  });

  if (selectedPlug) {
    plugNodes[selectedPlug].classList.add("selected");
  }

  plugPairs.forEach(pair => {
    plugNodes[pair[0]].classList.add("connected");
    plugNodes[pair[1]].classList.add("connected");
  });

  plugCount.textContent = plugPairs.length;
  drawCables();
}

function getPlugCenter(letter) {
  const plugRect = plugNodes[letter].getBoundingClientRect();
  const svgRect = plugSvg.getBoundingClientRect();

  return {
    x: plugRect.left + plugRect.width / 2 - svgRect.left,
    y: plugRect.top + plugRect.height / 2 - svgRect.top
  };
}

function drawCables() {
  plugSvg.innerHTML = "";

  plugPairs.forEach((pair, index) => {
    const a = getPlugCenter(pair[0]);
    const b = getPlugCenter(pair[1]);

    const dx = Math.abs(a.x - b.x);
    const lift = Math.max(35, Math.min(95, dx * 0.22));

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    path.setAttribute(
      "d",
      `M ${a.x} ${a.y} C ${a.x} ${a.y - lift}, ${b.x} ${b.y - lift}, ${b.x} ${b.y}`
    );

    path.setAttribute("class", "cable");
    path.setAttribute("stroke", CABLE_COLORS[index % CABLE_COLORS.length]);

    plugSvg.appendChild(path);
  });
}

function clearOutput() {
  outputText.value = "";
  inputText.value = "";
  resetPositions();
}

function resetAll() {
  clearOutput();
  plugPairs = [];
  selectedPlug = null;

  leftRotorSelect.value = "I";
  middleRotorSelect.value = "II";
  rightRotorSelect.value = "III";

  resetPositions();
  renderPlugboard();
}

window.addEventListener("resize", drawCables);

document.addEventListener("keydown", event => {
  const key = event.key.toUpperCase();

  if (LETTERS.includes(key)) {
    event.preventDefault();
    pressLetter(key);
  }
});

inputText.addEventListener("input", () => {
  inputText.value = inputText.value.toUpperCase();
});

playTextBtn.addEventListener("click", playInputText);
clearBtn.addEventListener("click", clearOutput);
resetBtn.addEventListener("click", resetAll);

[leftRotorSelect, middleRotorSelect, rightRotorSelect].forEach(select => {
  select.addEventListener("change", resetPositions);
});

buildMachine();
renderPlugboard();
