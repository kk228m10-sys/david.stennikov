/* Statistics for the experiment module: descriptive stats, Pearson r, ICC(2,1), Welch and paired t-tests. */
'use strict';
const Stat = (() => {
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const sd = a => {
    if (a.length < 2) return 0;
    const m = mean(a);
    return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
  };

  function pearson(x, y) {
    const mx = mean(x), my = mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < x.length; i++) {
      const dx = x[i] - mx, dy = y[i] - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }
    return sxy / Math.sqrt(sxx * syy);
  }

  // ICC(2,1): two-way random effects, absolute agreement, single measurement (McGraw & Wong ICC(A,1)), k = 2
  function icc21(x, y) {
    const n = x.length, k = 2;
    const g = mean([...x, ...y]);
    let ssr = 0, ssc = 0, sst = 0;
    for (let i = 0; i < n; i++) {
      ssr += k * ((x[i] + y[i]) / 2 - g) ** 2;
      sst += (x[i] - g) ** 2 + (y[i] - g) ** 2;
    }
    ssc = n * ((mean(x) - g) ** 2 + (mean(y) - g) ** 2);
    const sse = sst - ssr - ssc;
    const msr = ssr / (n - 1), msc = ssc / (k - 1), mse = sse / ((n - 1) * (k - 1));
    return (msr - mse) / (msr + (k - 1) * mse + k * (msc - mse) / n);
  }

  function lgamma(z) {
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
    z -= 1;
    let x = c[0];
    for (let i = 1; i < 9; i++) x += c[i] / (z + i);
    const t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function betacf(a, b, x) {
    const FPMIN = 1e-300;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < 3e-14) break;
    }
    return h;
  }

  function ibeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }

  // two-tailed p for Student's t
  const tp = (t, df) => (isFinite(t) ? ibeta(df / (df + t * t), df / 2, 0.5) : 0);

  function welch(a, b) {
    const ma = mean(a), mb = mean(b), va = sd(a) ** 2, vb = sd(b) ** 2, na = a.length, nb = b.length;
    const se = Math.sqrt(va / na + vb / nb);
    const t = se > 0 ? (ma - mb) / se : (ma === mb ? 0 : Infinity);
    const df = se > 0 ? (va / na + vb / nb) ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1)) : na + nb - 2;
    const sp = Math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2));
    return { t, df, p: tp(Math.abs(t), df), d: sp > 0 ? (ma - mb) / sp : 0, ma, mb };
  }

  function paired(a, b) {
    const d = a.map((x, i) => x - b[i]);
    const md = mean(d), s = sd(d);
    const t = s > 0 ? md / (s / Math.sqrt(d.length)) : (md === 0 ? 0 : Infinity);
    return { t, df: d.length - 1, p: tp(Math.abs(t), d.length - 1), md, sd: s };
  }

  return { mean, sd, pearson, icc21, welch, paired, tp };
})();
