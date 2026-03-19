export async function generateReceiptPNG(tx: any): Promise<Blob> {
  const W = 480;
  const H = 820;
  const dpr = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.scale(dpr, dpr);

  const format12Hour = (timestamp: number) => {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const rawHour = d.getHours();
    const hour = rawHour % 12 || 12;
    const minute = String(d.getMinutes()).padStart(2, '0');
    const period = rawHour >= 12 ? 'PM' : 'AM';
    return `${day} ${month} ${year}, ${hour}:${minute} ${period}`;
  };

  const fitFontSize = (text: string, maxWidth: number, startSize: number, minSize: number, weight = 900) => {
    let size = startSize;
    while (size > minSize) {
      ctx.font = `${weight} ${size}px Arial`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    }
    return minSize;
  };

  const drawLogoMark = (cx: number, topY: number) => {
    const drawLayer = (y: number, fill: string) => {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.strokeStyle = fill;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx + 18, y + 9);
      ctx.lineTo(cx, y + 18);
      ctx.lineTo(cx - 18, y + 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    drawLayer(topY, '#FF4F17');
    drawLayer(topY + 12, '#FFFFFF');
    drawLayer(topY + 24, '#7C3AED');
  };

  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#020B16');
  bg.addColorStop(1, '#01070F');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const cardX = 20;
  const cardY = 18;
  const cardW = W - 40;
  const cardH = H - 36;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  drawRoundedRect(cardX, cardY, cardW, cardH, 22);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const cx = W / 2;
  let y = 70;
  drawLogoMark(cx, y - 18);
  y += 40;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '900 40px Arial';
  ctx.fillStyle = '#E5E7EB';
  ctx.fillText('Pay', cx - 44, y);
  ctx.fillStyle = '#F97316';
  ctx.fillText('Me', cx + 16, y);
  ctx.font = '800 38px Arial';
  ctx.fillStyle = '#4EC3FF';
  ctx.fillText('Protocol', cx + 118, y);
  ctx.restore();
  y += 26;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 134, 224, 0.18)';
  ctx.fillRect(cx - 114, y, 228, 25);
  ctx.strokeStyle = 'rgba(0, 180, 255, 0.38)';
  ctx.strokeRect(cx - 114, y, 228, 25);
  ctx.font = '700 12px Arial';
  ctx.fillStyle = '#00A6FF';
  ctx.textAlign = 'center';
  ctx.fillText('TRANSACTION RECEIPT', cx, y + 17);
  ctx.restore();
  y += 74;

  const amountText = `${tx.currency === 'USDC' ? '$' : ''}${Number(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const amountFontSize = fitFontSize(amountText, W - 76, 72, 42, 900);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `900 ${amountFontSize}px Arial`;
  ctx.fillStyle = '#00D084';
  ctx.fillText(amountText, cx, y);
  ctx.restore();
  y += Math.max(32, amountFontSize * 0.5);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 208, 132, 0.16)';
  ctx.fillRect(cx - 84, y - 18, 168, 28);
  ctx.font = '800 19px Arial';
  ctx.fillStyle = '#00C777';
  ctx.textAlign = 'center';
  ctx.fillText('COMPLETED', cx, y + 2);
  ctx.font = '600 13px Arial';
  ctx.fillStyle = '#A7B2C2';
  ctx.fillText(format12Hour(tx.timestamp), cx, y + 24);
  ctx.restore();
  y += 54;

  ctx.beginPath();
  ctx.moveTo(cardX + 16, y);
  ctx.lineTo(cardX + cardW - 16, y);
  ctx.strokeStyle = 'rgba(0, 160, 255, 0.25)';
  ctx.stroke();
  y += 16;

  const rows = [
    { label: 'Type', value: 'Transfer' },
    { label: 'From', value: tx.senderAddress || '' },
    { label: 'To', value: tx.receiverAddress || '' },
    { label: 'Category', value: tx.category || 'Transfer' },
    { label: 'Fee', value: `${Number(tx.fee || 0).toFixed(6)} USDC` },
    { label: 'Transaction ID', value: tx.signature || '' },
  ];

  const rowX = cardX + 12;
  const rowW = cardW - 24;
  rows.forEach((row) => {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 26, 43, 0.95)';
    ctx.fillRect(rowX, y, rowW, 38);
    ctx.font = '600 13px Arial';
    ctx.fillStyle = 'rgba(179, 194, 211, 0.75)';
    ctx.textAlign = 'left';
    ctx.fillText(row.label, rowX + 10, y + 24);
    ctx.font = '700 13px Arial';
    ctx.fillStyle = '#E5E7EB';
    ctx.textAlign = 'right';
    const value = String(row.value || '');
    const clipped = value.length > 28 ? `${value.slice(0, 16)}...${value.slice(-8)}` : value;
    ctx.fillText(clipped, rowX + rowW - 10, y + 24);
    ctx.restore();
    y += 44;
  });

  y += 10;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '600 13px Arial';
  ctx.fillStyle = 'rgba(214, 224, 235, 0.85)';
  ctx.fillText('Verified on Solana Network', cx, y);
  y += 22;
  ctx.font = '500 11px Arial';
  ctx.fillStyle = 'rgba(150, 164, 180, 0.7)';
  ctx.fillText('This receipt confirms secure transaction processing', cx, y);
  y += 16;
  ctx.fillText('by the PayMe Protocol blockchain infrastructure.', cx, y);
  y += 28;
  ctx.fillStyle = 'rgba(0, 166, 255, 0.2)';
  ctx.fillRect(cx - 104, y - 16, 208, 26);
  ctx.strokeStyle = 'rgba(0, 166, 255, 0.45)';
  ctx.strokeRect(cx - 104, y - 16, 208, 26);
  ctx.font = '800 10px Arial';
  ctx.fillStyle = '#00A6FF';
  ctx.fillText('POWERED BY SOLANA BLOCKCHAIN', cx, y + 1);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}
