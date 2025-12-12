import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const generatePdfFromPages = async (pageClass: string, fileName: string) => {
  const pages = document.querySelectorAll('.' + pageClass);
  if (pages.length === 0) {
    alert('PDF로 변환할 페이지가 없습니다.');
    return;
  }

  // A4 size in mm: 210 x 297
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  try {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      
      // Add new page for subsequent elements
      if (i > 0) {
        pdf.addPage();
      }

      // Capture the page
      const canvas = await html2canvas(page, {
        scale: 2, // Higher scale for sharpness
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        // Ensure we capture the full fixed size of the A4 div
        windowWidth: 794, 
        windowHeight: 1123
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit exactly on A4 PDF page
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
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
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