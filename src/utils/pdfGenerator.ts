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
