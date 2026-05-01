import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// DOM commit 보장: 두 번의 RAF + microtask flush
const waitForFrames = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

// element 안에서 사용된 font-family를 거둬서 명시적으로 fonts.load() 호출
async function ensureFontsLoaded(root: HTMLElement) {
  const families = new Set<string>();
  const collect = (el: Element) => {
    const cs = window.getComputedStyle(el as HTMLElement);
    cs.fontFamily
      .split(',')
      .map((f) => f.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
      .forEach((f) => families.add(f));
  };

  collect(root);
  root.querySelectorAll('*').forEach(collect);

  // 16px 기준으로 모든 family를 명시적으로 로드 요청
  await Promise.all(
    Array.from(families).map((f) =>
      document.fonts.load(`16px "${f}"`).catch(() => undefined)
    )
  );
  // ready 자체도 한번 await (동시 로딩 중인 모든 폰트 완료 보장)
  await document.fonts.ready;
}

export const generatePdfFromPages = async (pageClass: string, fileName: string) => {
  const pages = document.querySelectorAll('.' + pageClass);
  if (pages.length === 0) {
    alert('PDF로 변환할 페이지가 없습니다.');
    return;
  }

  const pdf = new jsPDF('p', 'mm', 'a4');

  try {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      if (i > 0) pdf.addPage();

      // 폰트 로딩 + DOM commit 보장
      await ensureFontsLoaded(page);
      await waitForFrames();

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('PDF Generation failed:', error);
    alert('PDF 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
  }
};

/**
 * 각 페이지를 별도 PNG 파일로 저장. 페이지가 여러 개면 _1.png, _2.png 식으로 순차 다운로드.
 */
export const generateImagesFromPages = async (pageClass: string, fileName: string) => {
  const pages = document.querySelectorAll('.' + pageClass);
  if (pages.length === 0) {
    alert('이미지로 변환할 페이지가 없습니다.');
    return;
  }

  try {
    // 1) 모든 페이지를 먼저 캔버스로 캡처 (폰트 로딩 보장 후)
    const canvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      await ensureFontsLoaded(page);
      await waitForFrames();

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
      });
      canvases.push(canvas);
    }

    // 2) 각 캔버스를 PNG 데이터 URL로 변환 후 순차 다운로드
    const multi = canvases.length > 1;
    for (let i = 0; i < canvases.length; i++) {
      const dataUrl = canvases[i].toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = multi ? `${fileName}_${i + 1}.png` : `${fileName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 브라우저가 연속 다운로드를 막지 않도록 약간의 간격
      if (i < canvases.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  } catch (error) {
    console.error('Image generation failed:', error);
    alert('이미지 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
  }
};

export const downloadAsPdf = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('PDF로 변환할 요소를 찾을 수 없습니다.');
    return;
  }

  try {
    await ensureFontsLoaded(element);
    await waitForFrames();

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('PDF Generation failed:', error);
    alert('PDF 생성 중 오류가 발생했습니다.');
  }
};
