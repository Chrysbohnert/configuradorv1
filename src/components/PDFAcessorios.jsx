import React, { useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrency } from '../utils/formatters';

const PDFAcessorios = ({ proposta, cliente, acessorios, pagamento, total, vendedor }) => {
  const ref = useRef(null);
  const geradoRef = useRef(false);

  useEffect(() => {
    if (!ref.current || geradoRef.current) return;

    const gerar = async () => {
      try {
        geradoRef.current = true;
        const element = ref.current;
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const numero = proposta?.numero_proposta || 'ACE';
        pdf.save(`Proposta_Acessorios_${numero}.pdf`);
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF. Verifique o console.');
      }
    };

    const timer = setTimeout(gerar, 300);
    return () => clearTimeout(timer);
  }, [proposta]);

  const dataEmissao = proposta?.data
    ? new Date(proposta.data).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
      <div
        ref={ref}
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm',
          background: '#fff',
          color: '#111',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          lineHeight: 1.5,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', margin: 0 }}>PROPOSTA COMERCIAL DE ACESSÓRIOS</h1>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>
            Nº {proposta?.numero_proposta} — Emitida em {dataEmissao}
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>CLIENTE</h2>
          <p><strong>Nome:</strong> {cliente?.nome || cliente?.razao_social || 'Não informado'}</p>
          <p><strong>Documento:</strong> {cliente?.documento || '—'}</p>
          <p><strong>Telefone:</strong> {cliente?.telefone || '—'}</p>
          <p><strong>E-mail:</strong> {cliente?.email || '—'}</p>
          <p><strong>Endereço:</strong> {[cliente?.endereco, cliente?.cidade, cliente?.uf].filter(Boolean).join(', ') || '—'}</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>ACESSÓRIOS</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Código</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Descrição</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>Qtd</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Unitário</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {acessorios.map((item) => (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.codigo}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.nome}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{item.quantidade}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{formatCurrency(Number(item.preco))}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{formatCurrency(Number(item.preco) * item.quantidade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>CONDIÇÕES COMERCIAIS</h2>
          <p><strong>Forma de Pagamento:</strong> {pagamento?.formaPagamento?.replace('_', ' ')?.toUpperCase() || '—'}</p>
          <p><strong>Parcelamento:</strong> {pagamento?.parcelas || 1}x</p>
          {pagamento?.observacoes && <p><strong>Observações:</strong> {pagamento.observacoes}</p>}
        </div>

        <div style={{ textAlign: 'right', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '16px' }}>TOTAL: {formatCurrency(total)}</h2>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <p><strong>Vendedor:</strong> {vendedor?.nome || '—'}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
          <div style={{ width: '45%', borderTop: '1px solid #333', paddingTop: '8px', textAlign: 'center' }}>
            <p>Cliente</p>
          </div>
          <div style={{ width: '45%', borderTop: '1px solid #333', paddingTop: '8px', textAlign: 'center' }}>
            <p>Vendedor</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFAcessorios;
