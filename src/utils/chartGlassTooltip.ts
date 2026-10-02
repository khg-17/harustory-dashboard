// Shared Glassmorphism External Tooltip for Chart.js
export const externalGlassTooltip = (context: any) => {
  let tooltipEl = document.getElementById("chartjs-tooltip-glass");

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "chartjs-tooltip-glass";
    tooltipEl.style.position = "absolute";
    tooltipEl.style.pointerEvents = "none";
    tooltipEl.style.transition = "all 0.12s ease-out";
    tooltipEl.style.zIndex = "9999";
    tooltipEl.style.padding = "10px 14px";
    tooltipEl.style.borderRadius = "16px";
    tooltipEl.style.background = "rgba(255, 255, 255, 0.85)";
    tooltipEl.style.backdropFilter = "blur(20px) saturate(180%)";
    (tooltipEl.style as any).webkitBackdropFilter = "blur(20px) saturate(180%)";
    tooltipEl.style.border = "1px solid rgba(255, 255, 255, 0.9)";
    tooltipEl.style.boxShadow =
      "0 12px 36px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)";
    tooltipEl.style.color = "#191f28";
    tooltipEl.style.fontSize = "11.5px";
    tooltipEl.style.fontFamily = "Pretendard, -apple-system, sans-serif";
    document.body.appendChild(tooltipEl);
  }

  const tooltipModel = context.tooltip;
  if (!tooltipModel || tooltipModel.opacity === 0) {
    tooltipEl.style.opacity = "0";
    return;
  }

  if (tooltipModel.body) {
    const titleLines = tooltipModel.title || [];
    const bodyLines = tooltipModel.body.map((b: any) => b.lines);

    let innerHtml = "";
    if (titleLines.length) {
      innerHtml += `<div style="font-weight:700;font-size:12px;color:#191f28;margin-bottom:5px;letter-spacing:-0.02em;">${titleLines.join(
        " "
      )}</div>`;
    }

    bodyLines.forEach((body: string[], i: number) => {
      const colors = tooltipModel.labelColors?.[i] || {};
      // Line charts have transparent fills in backgroundColor, so prefer borderColor for crisp indicator
      const solidColor =
        colors.borderColor && colors.borderColor !== "transparent" && colors.borderColor !== "#fff" && colors.borderColor !== "#ffffff"
          ? colors.borderColor
          : colors.backgroundColor || "#3182f6";

      body.forEach((line) => {
        const dot = `<span style="background:${solidColor};width:8.5px;height:8.5px;display:inline-block;border-radius:50%;margin-right:7px;box-shadow:0 1.5px 4px ${solidColor}40;flex-shrink:0;"></span>`;
        
        // Format "Label: Value" with crisp distinct typography
        let contentHtml = `<span>${line}</span>`;
        if (line.includes(":")) {
          const colonIdx = line.indexOf(":");
          const labelPart = line.substring(0, colonIdx).trim();
          const valPart = line.substring(colonIdx + 1).trim();
          contentHtml = `<span style="color:#4e5968;font-weight:500;margin-right:4px;">${labelPart}:</span><span style="color:#191f28;font-weight:700;">${valPart}</span>`;
        }

        innerHtml += `<div style="display:flex;align-items:center;font-size:11.5px;margin-top:3.5px;line-height:1.4;">${dot}${contentHtml}</div>`;
      });
    });

    tooltipEl.innerHTML = innerHtml;
  }

  const position = context.chart.canvas.getBoundingClientRect();
  const left = position.left + window.scrollX + tooltipModel.caretX;
  let top = position.top + window.scrollY + tooltipModel.caretY - 10;
  let transform = "translate(-50%, -100%)";

  if (position.top + tooltipModel.caretY - 70 < 0) {
    top = position.top + window.scrollY + tooltipModel.caretY + 15;
    transform = "translate(-50%, 0%)";
  }

  tooltipEl.style.opacity = "1";
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.transform = transform;
};

// Common glass tooltip config to spread into Chart.js options.plugins.tooltip
export const glassTooltipOptions = {
  enabled: false,
  external: externalGlassTooltip,
};
