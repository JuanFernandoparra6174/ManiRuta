/* css/company_settings.css */

:root{
  --m-green: #3a6357;     /* tono verde elegante */
  --m-cyan:  #54bcbd;
  --m-soft:  #d4dfe2;
}

/* Page spacing */
.company-page{
  padding: 14px 0 34px;
}

/* Top hero */
.company-hero{
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
  background: #0b1b1a;
  box-shadow: 0 18px 55px rgba(15,23,42,.18);
}

.company-hero .bg{
  height: 240px;
  background-size: cover;
  background-position: center;
  filter: saturate(1.08) contrast(1.03);
}

.company-hero .bg::after{
  content:"";
  position:absolute; inset:0;
  background:
    radial-gradient(1200px 420px at 20% 10%, rgba(84,188,189,.40), transparent 60%),
    linear-gradient(180deg, rgba(0,0,0,0.0) 32%, rgba(0,0,0,.40));
}

.company-hero .content{
  position:absolute;
  inset:0;
  padding: 14px;
  display:flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}

.hero-top{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 12px;
}

.hero-title{
  margin:0;
  font-size: 18px;
  font-weight: 1000;
  color: #fff;
  text-shadow: 0 10px 30px rgba(0,0,0,.35);
}

.hero-sub{
  margin: 6px 0 0;
  color: rgba(255,255,255,.88);
  font-size: 13px;
  max-width: 72ch;
}

.hero-tags{
  display:flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.hero-tags .chip{
  background: rgba(255,255,255,.92);
  border: 1px solid rgba(15,23,42,.10);
}

.hero-kpis{
  display:flex;
  flex-wrap: wrap;
  gap: 10px;
}

.kpi{
  display:flex;
  align-items:center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255,255,255,.92);
  border: 1px solid rgba(15,23,42,.10);
  box-shadow: 0 10px 30px rgba(15,23,42,.14);
}

.kpi .n{
  font-size: 16px;
  font-weight: 1000;
}
.kpi .l{
  font-size: 12px;
  color: var(--muted);
  font-weight: 900;
}

/* Decorative shapes */
.blob{
  position:absolute;
  inset: -180px -160px auto auto;
  width: 520px; height: 520px;
  background: radial-gradient(circle at 30% 30%, rgba(84,188,189,.45), transparent 60%);
  pointer-events:none;
}

.ring{
  position:absolute;
  inset: 160px auto auto -120px;
  width: 320px; height: 320px;
  border-radius: 999px;
  border: 2px solid rgba(255,255,255,.10);
  box-shadow: inset 0 0 0 24px rgba(58,99,87,.10);
  pointer-events:none;
}

/* Grid layout */
.company-grid{
  margin-top: 12px;
  display:grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 1000px){
  .company-grid{
    grid-template-columns: 1.1fr .9fr;
    align-items: start;
  }
}

/* Cards / panels */
.panel{
  padding: 14px;
  border-radius: var(--radius);
  box-shadow: 0 18px 55px rgba(15,23,42,.10);
}

.panel-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.panel-head h3{
  margin:0;
  font-size: 14px;
  font-weight: 1000;
  display:flex;
  align-items:center;
  gap: 8px;
}

.mini-muted{
  font-size: 12px;
  color: var(--muted);
  font-weight: 900;
}

.grid2{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.grid1{
  display:grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.actions-row{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items:center;
  justify-content: space-between;
}

/* Soft buttons */
.btn-soft{
  cursor:pointer;
  border-radius: 14px;
  padding: 12px 14px;
  font-weight: 1000;
  border: 1px solid rgba(15,23,42,.10);
  background: rgba(255,255,255,.92);
  transition: transform .06s ease, opacity .2s ease;
}
.btn-soft:active{ transform: translateY(1px); }

.btn-ghosty{
  cursor:pointer;
  border-radius: 14px;
  padding: 12px 14px;
  font-weight: 1000;
  border: 1px solid rgba(84,188,189,.30);
  background: rgba(84,188,189,.08);
  color: #0f3a39;
  transition: transform .06s ease, opacity .2s ease;
}
.btn-ghosty:active{ transform: translateY(1px); }

.btn-danger{
  background: rgba(239,68,68,.10);
  border: 1px solid rgba(239,68,68,.20);
  color: #991b1b;
}

/* “Info tiles” */
.tiles{
  display:grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.tile{
  border-radius: 18px;
  padding: 12px;
  border: 1px solid rgba(15,23,42,.08);
  background: rgba(255,255,255,.75);
  box-shadow: 0 12px 32px rgba(15,23,42,.08);
}

.tile .t{
  margin:0;
  font-weight: 1000;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10px;
}
.tile .v{
  margin: 6px 0 0;
  color: rgba(15,23,42,.88);
  font-weight: 900;
  word-break: break-all;
}

.pill-status{
  display:inline-flex;
  align-items:center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  font-weight: 1000;
  border: 1px solid rgba(15,23,42,.10);
  background: rgba(255,255,255,.92);
}

.pill-status.on{
  background: rgba(34,197,94,.10);
  border-color: rgba(34,197,94,.22);
}
.pill-status.off{
  background: rgba(239,68,68,.10);
  border-color: rgba(239,68,68,.22);
  color: #991b1b;
}

/* Toasts */
.toast-ok{
  display:none;
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(34,197,94,.25);
  background: rgba(34,197,94,.10);
  font-size: 13px;
  font-weight: 900;
}

.toast-err{
  display:none;
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(239,68,68,.25);
  background: rgba(239,68,68,.10);
  font-size: 13px;
  font-weight: 900;
  color: #991b1b;
}
