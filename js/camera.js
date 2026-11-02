// 비디오 화면에서 카메라를 켜고 브라우저가 만든 영상 흐름을 돌려줍니다.
async function startCamera(video) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const error = new Error("카메라 기능을 사용할 수 없어요. HTTPS 주소 또는 내 PC에서 연 파일로 접속해 주세요.");
    error.name = "SecurityError";
    throw error;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      aspectRatio: { ideal: 4 / 3 }
    },
    audio: false
  });

  try {
    video.srcObject = stream;
    await video.play();
    return stream;
  } catch (error) {
    stream.getTracks().forEach(
      // 카메라 시작에 실패하면 열린 영상 트랙을 하나씩 닫습니다.
      (track) => track.stop()
    );
    video.srcObject = null;
    throw error;
  }
}

// 비디오 화면의 중앙을 잘라 가로 4:3 사진 데이터로 만들어 돌려줍니다.
function captureShot(video) {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("카메라 화면이 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.");
  }

  const targetRatio = 4 / 3;
  const sourceRatio = video.videoWidth / video.videoHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = video.videoWidth;
  let sourceHeight = video.videoHeight;

  if (sourceRatio > targetRatio) {
    sourceWidth = video.videoHeight * targetRatio;
    sourceX = (video.videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = video.videoWidth / targetRatio;
    sourceY = (video.videoHeight - sourceHeight) / 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("사진을 만들지 못했어요. 브라우저를 다시 열고 시도해 주세요.");
  }

  context.drawImage(
    video,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas.toDataURL("image/jpeg", 0.92);
}
