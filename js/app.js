const cutSelectScreen = document.getElementById("cutSelectScreen");
const captureScreen = document.getElementById("captureScreen");
const resultScreen = document.getElementById("resultScreen");
const twoCutButton = document.getElementById("twoCutButton");
const fourCutButton = document.getElementById("fourCutButton");
const captureButton = document.getElementById("captureButton");
const backToSelectButton = document.getElementById("backToSelectButton");
const startOverButton = document.getElementById("startOverButton");
const buttonLabel = document.getElementById("buttonLabel");
const cameraPreview = document.getElementById("cameraPreview");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const countdownDisplay = document.getElementById("countdown");
const statusMessage = document.getElementById("statusMessage");
const progressCount = document.getElementById("progressCount");
const shotPreviews = document.getElementById("shotPreviews");
const finalFrame = document.getElementById("finalFrame");
const resultHeading = document.getElementById("resultHeading");
const resultCopy = document.getElementById("resultCopy");
const filterContainer = document.getElementById("filters");
const cameraFlash = document.getElementById("cameraFlash");

let cameraStream = null;
let selectedCutCount = 0;
let isCapturing = false;
const state = {
  shots: [],
  filter: "original",
  renderId: 0
};

// 화면 하나만 보이도록 나머지 화면을 숨깁니다.
function showScreen(activeScreen) {
  const screens = [cutSelectScreen, captureScreen, resultScreen];
  for (const screen of screens) {
    screen.classList.toggle("hidden", screen !== activeScreen);
  }
}

// 촬영 전 상태를 비우고 선택한 컷 수에 맞춰 촬영 화면을 준비합니다.
function chooseCutCount(cutCount) {
  if (isCapturing) {
    return;
  }

  stopCamera();
  state.renderId += 1;
  selectedCutCount = cutCount;
  state.shots = [];
  state.filter = "original";
  renderFilterButtons();
  shotPreviews.replaceChildren();
  progressCount.textContent = `0 / ${selectedCutCount}`;
  buttonLabel.textContent = "촬영 시작";
  captureButton.disabled = false;
  backToSelectButton.disabled = false;
  statusMessage.textContent = `${selectedCutCount}컷 촬영을 시작할 준비가 됐어요.`;
  cameraPreview.classList.add("hidden");
  cameraPlaceholder.classList.remove("hidden");
  countdownDisplay.classList.add("hidden");
  showScreen(captureScreen);
}

// 2컷 프레임을 선택해 촬영 화면으로 이동합니다.
function chooseTwoCuts() {
  chooseCutCount(2);
}

// 4컷 프레임을 선택해 촬영 화면으로 이동합니다.
function chooseFourCuts() {
  chooseCutCount(4);
}

// 현재까지 찍은 사진을 작은 미리보기와 번호로 보여 줍니다.
function addShotPreview(photoData, shotNumber) {
  const preview = document.createElement("figure");
  preview.className = "shot-preview";
  preview.id = `shotPreview${shotNumber}`;

  const image = document.createElement("img");
  image.className = "shot-preview-image";
  image.id = `shotPreviewImage${shotNumber}`;
  image.src = photoData;
  image.alt = `${shotNumber}번째 촬영 사진 미리보기`;

  const caption = document.createElement("figcaption");
  caption.className = "shot-preview-caption";
  caption.id = `shotPreviewCaption${shotNumber}`;
  caption.textContent = `${shotNumber}번째`;

  preview.append(image, caption);
  shotPreviews.append(preview);
}

// 원본 사진 주소를 읽어 픽셀 필터링에 사용할 캔버스로 바꿉니다.
async function createShotCanvas(shotData) {
  const image = await new Promise(
    // 사진이 완전히 읽힌 뒤 캔버스로 옮길 수 있도록 기다립니다.
    (resolve, reject) => {
      const sourceImage = new Image();
      // 사진을 읽으면 다음 단계에서 원본 크기대로 캔버스에 그립니다.
      sourceImage.onload = function onSourceLoaded() {
        resolve(sourceImage);
      };
      // 읽지 못한 사진은 결과 화면에 한국어 오류로 알립니다.
      sourceImage.onerror = function onSourceFailed() {
        reject(new Error("원본 사진을 불러오지 못했어요. 다시 촬영해 주세요."));
      };
      sourceImage.src = shotData;
    }
  );

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("사진 필터를 준비하지 못했어요. 다시 시도해 주세요.");
  }

  context.drawImage(image, 0, 0);
  return canvas;
}

// 결과 화면에 필터를 적용한 사진과 변하지 않는 프레임을 다시 그립니다.
async function renderResult() {
  if (!state.shots.length) {
    throw new Error("촬영 사진이 없어요. 먼저 사진을 찍어 주세요.");
  }

  const renderId = ++state.renderId;
  const selectedFilter = state.filter;
  let resultShots = state.shots;
  if (selectedFilter !== "original") {
    resultShots = [];
    for (const shot of state.shots) {
      const sourceCanvas = await createShotCanvas(shot);
      if (renderId !== state.renderId) {
        return false;
      }
      const filteredCanvas = applyFilter(sourceCanvas, selectedFilter);
      resultShots.push(filteredCanvas.toDataURL("image/png"));
    }
  }

  const strip = await makeStrip(resultShots);
  if (renderId !== state.renderId) {
    return false;
  }

  finalFrame.width = strip.width;
  finalFrame.height = strip.height;
  const context = finalFrame.getContext("2d");
  if (!context) {
    throw new Error("완성 사진을 화면에 보여 주지 못했어요. 다시 시도해 주세요.");
  }

  context.drawImage(strip, 0, 0);
  return true;
}

// 필터 목록을 읽어 화면 버튼을 만들고 현재 선택 상태를 표시합니다.
function renderFilterButtons() {
  filterContainer.replaceChildren();

  for (const filter of FILTERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = `filterButton-${filter.name}`;
    button.className = "filter-btn";
    button.textContent = filter.label;
    button.setAttribute("aria-pressed", String(state.filter === filter.name));
    button.classList.toggle("active", state.filter === filter.name);
    button.addEventListener(
      "click",
      // 누른 필터 이름을 상태에 저장하고 완성 사진을 다시 그립니다.
      async function onFilterButtonClick() {
        await selectFilter(filter.name);
      }
    );
    filterContainer.append(button);
  }
}

// 고른 필터를 적용하고 실패하면 이전 결과와 선택을 유지합니다.
async function selectFilter(filterName) {
  if (state.filter === filterName) {
    resultCopy.textContent = "마음에 드는 세로 프레임이 완성됐어요.";
    return;
  }

  const previousFilter = state.filter;
  state.filter = filterName;
  const renderId = state.renderId + 1;
  renderFilterButtons();
  resultCopy.textContent = "필터를 적용하고 있어요...";

  try {
    const rendered = await renderResult();
    if (!rendered) {
      return;
    }
    resultCopy.textContent = "마음에 드는 세로 프레임이 완성됐어요.";
  } catch (error) {
    if (renderId !== state.renderId) {
      return;
    }
    state.filter = previousFilter;
    renderFilterButtons();
    const errorMessage = error instanceof Error
      ? error.message
      : "다시 시도해 주세요.";
    resultCopy.textContent = `필터를 적용하지 못했어요. ${errorMessage}`;
  }
}

// 정해진 시간만큼 기다려 카운트다운과 컷 사이의 간격을 맞춥니다.
function wait(milliseconds) {
  return new Promise(
    // 기다리는 시간이 지나면 촬영 순서의 다음 단계로 넘어갑니다.
    (resolve) => {
      window.setTimeout(resolve, milliseconds);
    }
  );
}

// 카메라 오류를 상황에 맞는 한국어 안내로 바꿉니다.
function getCameraErrorMessage(error) {
  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "카메라 권한이 필요해요. 브라우저 설정에서 카메라 사용을 허용해 주세요.";
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "사용할 수 있는 카메라를 찾지 못했어요. 카메라가 연결되어 있는지 확인해 주세요.";
  }

  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "카메라가 다른 앱에서 사용 중일 수 있어요. 다른 앱을 닫고 다시 시도해 주세요.";
  }

  if (error.name === "SecurityError") {
    return "카메라를 켤 수 없어요. HTTPS 주소 또는 내 PC에서 연 파일로 접속해 주세요.";
  }

  if (/[가-힣]/.test(error.message || "")) {
    return error.message;
  }

  return "촬영을 마치지 못했어요. 카메라와 브라우저 권한을 확인한 뒤 다시 시도해 주세요.";
}

// 사용이 끝난 카메라를 끄고 기기의 카메라 사용을 해제합니다.
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(
      // 사용이 끝난 카메라 영상 트랙을 모두 닫습니다.
      (track) => track.stop()
    );
    cameraStream = null;
  }

  cameraPreview.srcObject = null;
}

// 5부터 1까지 표시하고 각 숫자를 1초 동안 보여 줍니다.
async function runCountdown(shotNumber) {
  for (let secondsLeft = 5; secondsLeft > 0; secondsLeft -= 1) {
    progressCount.textContent = `${shotNumber} / ${selectedCutCount}`;
    countdownDisplay.textContent = String(secondsLeft);
    countdownDisplay.classList.remove("hidden");
    statusMessage.textContent = `${shotNumber}번째 사진을 찍어요. 준비해 주세요!`;
    await wait(1000);
  }

  countdownDisplay.classList.add("hidden");
}

// 시작 버튼 한 번으로 선택한 수만큼 카운트다운과 촬영을 이어갑니다.
async function runCaptureSequence() {
  if (isCapturing || !selectedCutCount) {
    return;
  }

  isCapturing = true;
  captureButton.disabled = true;
  backToSelectButton.disabled = true;
  buttonLabel.textContent = "촬영 중...";
  state.renderId += 1;
  state.shots = [];
  state.filter = "original";
  renderFilterButtons();
  shotPreviews.replaceChildren();
  progressCount.textContent = `0 / ${selectedCutCount}`;
  statusMessage.textContent = "카메라를 준비하고 있어요...";

  try {
    cameraStream = await startCamera(cameraPreview);
    cameraPlaceholder.classList.add("hidden");
    cameraPreview.classList.remove("hidden");

    for (let index = 0; index < selectedCutCount; index += 1) {
      const shotNumber = index + 1;
      await runCountdown(shotNumber);
      const photoData = captureShot(cameraPreview);
      state.shots.push(photoData);
      addShotPreview(photoData, shotNumber);
      progressCount.textContent = `${shotNumber} / ${selectedCutCount}`;
      cameraFlash.classList.remove("is-active");
      void cameraFlash.offsetWidth;
      cameraFlash.classList.add("is-active");

      if (shotNumber < selectedCutCount) {
        statusMessage.textContent = `${shotNumber}번째 사진 완료! 다음 사진을 준비해 주세요.`;
        await wait(700);
      }
    }

    statusMessage.textContent = "세로 프레임을 만들고 있어요...";
    state.filter = "original";
    renderFilterButtons();
    await renderResult();
    resultCopy.textContent = "마음에 드는 세로 프레임이 완성됐어요.";
    resultHeading.textContent = selectedCutCount === 2 ? "오늘의 두 순간" : "오늘의 네 순간";
    stopCamera();
    showScreen(resultScreen);
  } catch (error) {
    statusMessage.textContent = getCameraErrorMessage(error);
    countdownDisplay.classList.add("hidden");
    cameraPreview.classList.add("hidden");
    cameraPlaceholder.classList.remove("hidden");
    state.shots = [];
    state.filter = "original";
    renderFilterButtons();
    shotPreviews.replaceChildren();
    progressCount.textContent = `0 / ${selectedCutCount}`;
    stopCamera();
  } finally {
    isCapturing = false;
    captureButton.disabled = false;
    backToSelectButton.disabled = false;
    buttonLabel.textContent = "다시 촬영";
  }
}

// 첫 화면으로 돌아가 선택, 사진 미리보기와 완성 프레임을 초기화합니다.
function returnToCutSelection() {
  if (isCapturing) {
    return;
  }

  stopCamera();
  state.renderId += 1;
  selectedCutCount = 0;
  state.shots = [];
  state.filter = "original";
  renderFilterButtons();
  shotPreviews.replaceChildren();
  progressCount.textContent = "0 / 0";
  const context = finalFrame.getContext("2d");
  if (context) {
    context.clearRect(0, 0, finalFrame.width, finalFrame.height);
  }
  statusMessage.textContent = "선택한 프레임을 촬영할 준비가 됐어요.";
  showScreen(cutSelectScreen);
}

twoCutButton.addEventListener("click", chooseTwoCuts);
fourCutButton.addEventListener("click", chooseFourCuts);
captureButton.addEventListener("click", runCaptureSequence);
backToSelectButton.addEventListener("click", returnToCutSelection);
startOverButton.addEventListener("click", returnToCutSelection);
window.addEventListener("pagehide", stopCamera);
renderFilterButtons();
