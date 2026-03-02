/* css/company_settings.css */

.settings-page{
  padding: 14px 0 34px;
}

.settings-hero{
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
}

.settings-hero .bg{
  height: 220px;
  background-size: cover;
  background-position: center;
  filter: saturate(1.05);
}

.settings-hero .bg::after{
  content:"";
  position:absolute; inset:0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.34));
}

.settings-hero .content{
  position:absolute;
  inset:0;
  padding: 14px;
  display:flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}

.decor{
  position:absolute;
  inset: -150px -120px auto auto;
  width: 420px; height: 420px;
  background: radial-gradient(circle at 30% 30%, rgba(84,188,189,.42), transparent 62%);
  pointer-events:none;
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
  max-width: 70ch;
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

.kpi-strip{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
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

.kpi .n{ font-size: 16px; font-weight: 1000; }
.kpi .l{ font-size: 12px; color: var(--muted); font-weight: 900; }

.settings-grid{
  margin-top: 12px;
  display:grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 900px){
  .settings-grid{
    grid-template-columns: 1fr 420px;
    align-items: start;
  }
}

.panel{
  padding: 14px;
  border-radius: var(--radius);
}

.panel-title{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.panel-title h3{
  margin:0;
  font-size: 14px;
  font-weight: 1000;
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

.btn-danger{
  background: rgba(239,68,68,.10);
  border: 1px solid rgba(239,68,68,.20);
  color: #991b1b;
}

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

.mini-muted{
  font-size: 12px;
  color: var(--muted);
  font-weight: 900;
}

.readonly{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,.10);
  background: rgba(255,255,255,.7);
  font-weight: 900;
}

.danger{
  border: 1px solid rgba(239,68,68,.22);
  background: rgba(239,68,68,.06);
}

.badge-danger{
  display:inline-flex;
  align-items:center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  font-weight: 1000;
  background: rgba(239,68,68,.10);
  border: 1px solid rgba(239,68,68,.22);
  color: #991b1b;
}
