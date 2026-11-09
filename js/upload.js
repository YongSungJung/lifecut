let supabaseClient = null;

// 첫 업로드 때 Supabase 연결을 만들고, 그 뒤에는 같은 연결을 재사용합니다.
function getClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (
    SUPABASE_URL === "여기에-내-프로젝트주소"
    || SUPABASE_KEY === "여기에-내-키"
    || !SUPABASE_URL.trim()
    || !SUPABASE_KEY.trim()
  ) {
    throw new Error("js/config.js 에 내 Supabase 주소와 키를 먼저 넣어 주세요");
  }

  if (typeof supabase === "undefined" || typeof supabase.createClient !== "function") {
    throw new Error("Supabase 연결 파일을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.");
  }

  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabaseClient;
}

// 날짜와 시간, 무작위 문자 여섯 개를 붙인 JPG 파일 이름을 만듭니다.
function createPhotoFileName() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
  const randomPart = Math.random().toString(36).slice(2, 8).padEnd(6, "0");

  return `${date}${time}-${randomPart}.jpg`;
}

// 캔버스를 JPG 화질 0.9의 파일 데이터로 바꿉니다.
function createJpegBlob(canvas) {
  return new Promise(
    // JPG 인코딩 결과를 Promise(비동기 작업의 결과)로 전달합니다.
    (resolve, reject) => {
      canvas.toBlob(
        // 인코딩된 파일을 받거나 실패하면 알맞은 결과로 끝냅니다.
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error("완성 사진을 JPG 파일로 만들지 못했어요. 다시 시도해 주세요."));
        },
        "image/jpeg",
        0.9
      );
    }
  );
}

// 완성 사진을 photos 버킷에 올리고 공개 주소를 돌려줍니다.
async function uploadPhoto(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("올릴 완성 사진을 찾지 못했어요. 다시 촬영해 주세요.");
  }

  const blob = await createJpegBlob(canvas);
  const fileName = createPhotoFileName();
  const client = getClient();
  const { data, error } = await client.storage
    .from(PHOTO_BUCKET)
    .upload(fileName, blob, {
      contentType: "image/jpeg",
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = client.storage
    .from(PHOTO_BUCKET)
    .getPublicUrl(data.path);
  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error("사진 주소를 만들지 못했어요. 다시 시도해 주세요.");
  }

  return publicUrlData.publicUrl;
}

// 지정한 화면 요소를 비우고 사진 주소가 담긴 200×200 QR 코드를 그립니다.
function drawQrCode(element, url) {
  element.replaceChildren();
  if (typeof QRCode !== "function") {
    throw new Error("QR 코드 파일을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.");
  }

  return new QRCode(element, {
    text: url,
    width: 200,
    height: 200
  });
}
