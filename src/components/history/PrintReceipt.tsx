import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Loader } from 'lucide-react';
import type { Transaction } from '../../types';
import { getGlobalCurrency } from '../../lib/appState';
import { transactionFromLabel, transactionToLabel } from '../../lib/transactionDisplay';

interface PrintReceiptProps {
  transaction: Transaction;
  onClose: () => void;
}

function formatReceiptTxId(id: string) {
  return id;
}

function formatReceiptDate(value: string) {
  const d = new Date(value);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = d.getHours();
  const hour12 = hh % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  const period = hh >= 12 ? 'PM' : 'AM';
  return `${mm}-${dd}-${yy} ${hour12}:${min} ${period}`;
}

function formatCompactCurrencyAmount(amount: number, symbol: string) {
  if (Math.abs(amount) >= 1000) {
    return `${symbol}${new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)}`;
  }
  return `${symbol}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  color: string,
  strokeWidth: number,
) {
  const ow = width / 2;
  const oh = height / 2;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - oh);
  ctx.lineTo(cx + ow, cy);
  ctx.lineTo(cx, cy + oh);
  ctx.lineTo(cx - ow, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawReceiptLogo(ctx: CanvasRenderingContext2D, cx: number, y: number) {
  drawDiamond(ctx, cx, y + 16, 70, 28, '#7C3AED', 2.5);
  drawDiamond(ctx, cx, y + 8, 70, 28, '#FFFFFF', 2.5);
  drawDiamond(ctx, cx, y + 0, 70, 28, '#FF4F17', 2.5);
}

function ReceiptLogoMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 29L2 22L16 15L30 22L16 29Z" fill="#7C3AED" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 23L2 16L16 9L30 16L16 23Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 17L2 10L16 3L30 10L16 17Z" fill="#FF4F17" stroke="#FF4F17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  weight = 900,
) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px Arial`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minSize;
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  label: string,
  value: string,
  left: number,
  width: number,
) {
  const rowHeight = 48;
  const isTxId = label === 'Transaction ID';
  ctx.save();
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(left, y, width, rowHeight);
  ctx.font = '600 16px Arial';
  ctx.fillStyle = '#6B7280';
  ctx.textAlign = 'left';
  ctx.fillText(label, left + 20, y + 30);
  const valueSize = isTxId ? fitFontSize(ctx, value, width * 0.58, 13, 9, 700) : 16;
  ctx.font = `700 ${valueSize}px Arial`;
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'right';
  const finalValue = isTxId ? value : (value.length > 34 ? `${value.slice(0, 22)}...` : value);
  ctx.fillText(finalValue, left + width - 18, y + 30);
  ctx.restore();
}

export default function PrintReceipt({ transaction, onClose }: PrintReceiptProps) {
  const downloadAnchorRef = useRef<HTMLAnchorElement>(null);
  const [downloading, setDownloading] = useState(false);

  const isReceive = transaction.type === 'receive';
  const fromLabel = transactionFromLabel(transaction);
  const toLabel = transactionToLabel(transaction);
  const currency = getGlobalCurrency();
  const amountInCurrency = transaction.amount_usdc * currency.rate;
  const amountDisplay = `${isReceive ? '+' : '-'}${formatCompactCurrencyAmount(amountInCurrency, currency.symbol)}`;
  const receiptDate = formatReceiptDate(transaction.created_at);
  const category = transaction.category
    ? transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)
    : 'Transfer';

  const rows = [
    { label: 'Type', value: isReceive ? 'Receive' : 'Send' },
    { label: 'From', value: fromLabel },
    { label: 'To', value: toLabel },
    { label: 'Category', value: category },
    ...(transaction.narration ? [{ label: 'Reference', value: transaction.narration }] : []),
    { label: 'Transaction ID', value: formatReceiptTxId(transaction.id) },
  ];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const W = 783;
      const H = 1280;
      const dpr = 2;
      const canvas = document.createElement('canvas');
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#DADDE4');
      bg.addColorStop(1, '#D0D4DD');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2;
      let y = 72;
      drawReceiptLogo(ctx, cx, y);
      y += 94;

      // Draw title as one centered line without overlap.
      ctx.save();
      ctx.textAlign = 'left';
      const payFont = '900 56px Arial';
      const protocolFont = '800 54px Arial';
      ctx.font = payFont;
      const payW = ctx.measureText('Pay').width;
      const meW = ctx.measureText('Me').width;
      ctx.font = protocolFont;
      const protocolW = ctx.measureText('Protocol').width;
      const totalW = payW + meW + protocolW + 6;
      let x = cx - totalW / 2;
      ctx.font = payFont;
      ctx.fillStyle = '#0F172A';
      ctx.fillText('Pay', x, y);
      x += payW;
      ctx.fillStyle = '#FF5A1F';
      ctx.fillText('Me', x, y);
      x += meW + 6;
      ctx.font = protocolFont;
      ctx.fillStyle = '#6366F1';
      ctx.fillText('Protocol', x, y);
      ctx.restore();
      y += 38;

      const badgeWidth = 270;
      ctx.save();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(cx - badgeWidth / 2, y, badgeWidth, 36);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - badgeWidth / 2, y, badgeWidth, 36);
      ctx.font = '700 18px Arial';
      ctx.fillStyle = '#2563EB';
      ctx.textAlign = 'center';
      ctx.fillText('TRANSACTION RECEIPT', cx, y + 24);
      ctx.restore();
      y += 126;

      ctx.save();
      ctx.textAlign = 'center';
      const fittedAmountSize = fitFontSize(ctx, amountDisplay, W - 170, 86, 44, 900);
      ctx.font = `900 ${fittedAmountSize}px Arial`;
      ctx.fillStyle = isReceive ? '#16A34A' : '#111827';
      ctx.fillText(amountDisplay, cx, y);
      ctx.restore();
      y += Math.max(54, fittedAmountSize * 0.6);

      ctx.save();
      ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
      ctx.fillRect(cx - 130, y - 26, 260, 42);
      ctx.font = '800 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#16A34A';
      ctx.fillText('. COMPLETED', cx, y + 6);
      ctx.font = '600 24px Arial';
      ctx.fillStyle = '#6B7280';
      ctx.fillText(receiptDate, cx, y + 54);
      ctx.restore();
      y += 124;

      ctx.beginPath();
      ctx.moveTo(54, y);
      ctx.lineTo(W - 54, y);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      y += 30;

      const rowLeft = 78;
      const rowWidth = W - rowLeft * 2;
      rows.forEach((row) => {
        drawRow(ctx, y, row.label, row.value, rowLeft, rowWidth);
        y += 56;
      });

      y += 18;
      ctx.beginPath();
      ctx.moveTo(78, y);
      ctx.lineTo(W - 78, y);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      y += 86;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '600 27px Arial';
      ctx.fillStyle = '#1F2937';
      ctx.fillText('Verified on Solana Network', cx, y);
      y += 30;
      ctx.font = '500 19px Arial';
      ctx.fillStyle = '#6B7280';
      ctx.fillText('This receipt confirms secure transaction processing', cx, y);
      y += 28;
      ctx.fillText('by the PayMe Protocol blockchain infrastructure.', cx, y);
      y += 66;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(cx - 195, y - 31, 390, 50);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 195, y - 31, 390, 50);
      ctx.font = '800 19px Arial';
      ctx.fillStyle = '#2563EB';
      ctx.fillText('POWERED BY SOLANA BLOCKCHAIN', cx, y + 4);
      ctx.restore();

      canvas.toBlob((blob) => {
        if (blob && downloadAnchorRef.current) {
          const url = URL.createObjectURL(blob);
          downloadAnchorRef.current.href = url;
          downloadAnchorRef.current.download = `PayMe_Receipt_${transaction.id.slice(0, 8)}.png`;
          downloadAnchorRef.current.click();
          setTimeout(() => URL.revokeObjectURL(url), 500);
        }
        setDownloading(false);
      }, 'image/png');
    } catch (err) {
      console.error('Receipt export failed:', err);
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'linear-gradient(180deg, #DADDE4 0%, #D0D4DD 100%)',
          borderRadius: '28px 28px 0 0',
          borderTop: '1px solid rgba(148, 163, 184, 0.3)',
          padding: '0 24px 52px',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255, 255, 255, 0.15)', margin: '14px auto 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 24px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Receipt</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#111827',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            borderRadius: 20,
            padding: '20px 16px 22px',
            marginBottom: 24,
            background: 'linear-gradient(180deg, #E1E5EC 0%, #D7DCE5 100%)',
            border: '1px solid rgba(148, 163, 184, 0.24)',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ display: 'inline-flex', marginBottom: 8 }}>
              <ReceiptLogoMark />
            </div>
            <div>
              <span style={{ fontSize: 31, fontWeight: 900, color: '#0F172A' }}>Pay</span>
              <span style={{ fontSize: 31, fontWeight: 900, color: '#FF5A1F' }}>Me </span>
              <span style={{ fontSize: 31, fontWeight: 900, color: '#6366F1' }}>Protocol</span>
            </div>
            <div style={{ marginTop: 8, display: 'inline-block', border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', fontSize: 10, color: '#2563EB', fontWeight: 700 }}>
              TRANSACTION RECEIPT
            </div>
          </div>

          <p style={{ fontSize: 'clamp(34px, 9vw, 58px)', lineHeight: 1.06, fontWeight: 900, textAlign: 'center', color: isReceive ? '#16A34A' : '#111827', marginBottom: 8, letterSpacing: '-0.6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {amountDisplay}
          </p>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{ display: 'inline-block', background: 'rgba(34,197,94,0.12)', padding: '5px 12px', color: '#16A34A', fontWeight: 800, fontSize: 14, borderRadius: 999 }}>
              COMPLETED
            </span>
            <div style={{ marginTop: 6, color: '#6B7280', fontWeight: 600 }}>{receiptDate}</div>
          </div>

          <div style={{ height: 1, background: 'rgba(148,163,184,0.32)', marginBottom: 14 }} />

          {rows.map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F3F4F6', padding: '14px 14px', marginBottom: 8, borderRadius: 12 }}>
              <span style={{ color: '#6B7280', fontSize: 13, fontWeight: 600 }}>{label}</span>
              <span
                style={{
                  color: '#111827',
                  fontSize: label === 'Transaction ID' ? 11 : 13,
                  fontWeight: 700,
                  textAlign: 'right',
                  maxWidth: label === 'Transaction ID' ? '70%' : '58%',
                  fontFamily: label === 'Transaction ID' ? 'monospace' : 'inherit',
                  overflowWrap: label === 'Transaction ID' ? 'anywhere' : 'normal',
                  whiteSpace: label === 'Transaction ID' ? 'normal' : 'nowrap',
                }}
              >
                {value}
              </span>
            </div>
          ))}

          <div style={{ height: 1, background: 'rgba(148,163,184,0.32)', margin: '14px 0 18px' }} />

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#1F2937', marginBottom: 6 }}>Verified on Solana Network</p>
            <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.45, margin: '0 auto 12px', maxWidth: 260 }}>
              This receipt confirms secure transaction processing by the PayMe Protocol blockchain infrastructure.
            </p>
            <span style={{ display: 'inline-block', border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.1)', padding: '6px 10px', fontSize: 9, color: '#2563EB', fontWeight: 800 }}>
              POWERED BY SOLANA BLOCKCHAIN
            </span>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleDownload}
          disabled={downloading}
          style={{ width: '100%', height: 56, borderRadius: 18, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          {downloading ? <Loader size={19} className="spin" /> : <Download size={19} />}
          {downloading ? 'Saving...' : 'Download Receipt'}
        </button>

        <a ref={downloadAnchorRef} style={{ display: 'none' }} />
      </motion.div>
    </motion.div>
  );
}
