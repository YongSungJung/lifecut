// 색상 값이 0부터 255 사이의 정수로 유지되도록 맞춥니다.
function clamp(value) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

// 화면 이름과 사진의 빨강·초록·파랑 값을 바꾸는 규칙을 모아 둡니다.
const FILTERS = [
  {
    name: "original",
    label: "원본",
    // 원본 색의 빨강·초록·파랑 값을 그대로 돌려줍니다.
    apply: (red, green, blue) => ({ red, green, blue })
  },
  {
    name: "grayscale",
    label: "흑백",
    // 사람 눈의 밝기 비율을 이용해 세 색을 같은 회색으로 바꿉니다.
    apply: (red, green, blue) => {
      const gray = red * 0.299 + green * 0.587 + blue * 0.114;
      return { red: gray, green: gray, blue: gray };
    }
  },
  {
    name: "sepia",
    label: "세피아",
    // 널리 쓰이는 세피아 색상 계수로 따뜻한 갈색을 만듭니다.
    apply: (red, green, blue) => ({
      red: red * 0.393 + green * 0.769 + blue * 0.189,
      green: red * 0.349 + green * 0.686 + blue * 0.168,
      blue: red * 0.272 + green * 0.534 + blue * 0.131
    })
  },
  {
    name: "warm",
    label: "따뜻하게",
    // 빨강과 초록을 더하고 파랑을 줄여 따뜻한 색을 만듭니다.
    apply: (red, green, blue) => ({
      red: red + 18,
      green: green + 5,
      blue: blue - 12
    })
  },
  {
    name: "cool",
    label: "시원하게",
    // 파랑을 더하고 빨강을 줄여 시원한 색을 만듭니다.
    apply: (red, green, blue) => ({
      red: red - 10,
      green: green + 6,
      blue: blue + 20
    })
  },
  {
    name: "bright",
    label: "화사하게",
    // 세 색을 밝게 올리되 결과 범위는 clamp로 제한합니다.
    apply: (red, green, blue) => ({
      red: red * 1.12 + 8,
      green: green * 1.12 + 8,
      blue: blue * 1.12 + 8
    })
  }
];

// 원본 캔버스는 건드리지 않고 선택한 필터가 적용된 새 캔버스를 돌려줍니다.
function applyFilter(canvas, filterName) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("필터를 적용할 사진을 찾지 못했어요.");
  }

  const filter = FILTERS.find((item) => item.name === filterName);
  if (!filter) {
    throw new Error("선택한 필터를 찾지 못했어요. 다른 필터를 골라 주세요.");
  }

  const resultCanvas = document.createElement("canvas");
  resultCanvas.width = canvas.width;
  resultCanvas.height = canvas.height;

  const context = resultCanvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("사진 필터를 준비하지 못했어요. 다시 시도해 주세요.");
  }

  context.drawImage(canvas, 0, 0);
  const imageData = context.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const color = filter.apply(pixels[index], pixels[index + 1], pixels[index + 2]);
    pixels[index] = clamp(color.red);
    pixels[index + 1] = clamp(color.green);
    pixels[index + 2] = clamp(color.blue);
  }

  context.putImageData(imageData, 0, 0);
  return resultCanvas;
}
