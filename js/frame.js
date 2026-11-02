const STRIP_WIDTH = 720;
const STRIP_SIDE_MARGIN = 36;
const STRIP_TOP_MARGIN = 36;
const STRIP_PHOTO_WIDTH = STRIP_WIDTH - STRIP_SIDE_MARGIN * 2;
const STRIP_PHOTO_HEIGHT = STRIP_PHOTO_WIDTH * 3 / 4;
const STRIP_GAP = 24;
const STRIP_FOOTER_HEIGHT = 112;

// 이미지 주소 하나를 불러와 프레임에 넣을 수 있는 사진으로 돌려줍니다.
function loadStripPhoto(shot) {
  return new Promise(
    // 사진이 준비되거나 읽기에 실패하면 그 결과를 프레임 만들기에 전달합니다.
    (resolve, reject) => {
      const image = new Image();
      // 사진 파일을 불러오면 프레임 제작을 이어가도록 알립니다.
      image.onload = function onPhotoLoaded() {
        resolve(image);
      };
      // 사진 파일을 읽지 못하면 알아볼 수 있는 오류로 알립니다.
      image.onerror = function onPhotoLoadFailed() {
        reject(new Error("사진을 프레임에 넣지 못했어요. 다시 촬영해 주세요."));
      };
      image.src = shot;
    }
  );
}

// 이미지 주소 목록을 촬영 순서대로 불러와 사용할 수 있게 돌려줍니다.
async function loadStripPhotos(shots) {
  const photos = [];
  for (const shot of shots) {
    photos.push(await loadStripPhoto(shot));
  }
  return photos;
}

// 촬영 사진을 흰 바탕의 4:3 세로 프레임 한 장으로 합쳐 돌려줍니다.
async function makeStrip(shots) {
  if (!Array.isArray(shots) || (shots.length !== 2 && shots.length !== 4)) {
    throw new Error("프레임에는 2장 또는 4장의 사진이 필요해요.");
  }

  const photos = await loadStripPhotos(shots);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("완성 사진을 만들지 못했어요. 다시 시도해 주세요.");
  }

  canvas.width = STRIP_WIDTH;
  canvas.height = STRIP_TOP_MARGIN
    + photos.length * STRIP_PHOTO_HEIGHT
    + (photos.length - 1) * STRIP_GAP
    + STRIP_FOOTER_HEIGHT;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  photos.forEach(
    // 촬영 순서대로 같은 크기의 4:3 사진 칸에 배치합니다.
    (photo, index) => {
      const top = STRIP_TOP_MARGIN + index * (STRIP_PHOTO_HEIGHT + STRIP_GAP);
      context.drawImage(photo, STRIP_SIDE_MARGIN, top, STRIP_PHOTO_WIDTH, STRIP_PHOTO_HEIGHT);
    }
  );

  const footerTop = STRIP_TOP_MARGIN
    + photos.length * STRIP_PHOTO_HEIGHT
    + (photos.length - 1) * STRIP_GAP;
  context.fillStyle = "#29232d";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 30px 'Malgun Gothic', sans-serif";
  context.fillText("인생네컷", canvas.width / 2, footerTop + 40);
  context.fillStyle = "#756c78";
  context.font = "400 18px 'Malgun Gothic', sans-serif";
  context.fillText(getStripDate(), canvas.width / 2, footerTop + 76);

  return canvas;
}

// 오늘 날짜를 완성 사진에 표시할 한국어 형식으로 돌려줍니다.
function getStripDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}
