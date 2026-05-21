import { useState, useEffect, useRef } from "react";

const VEHICLES = [
  { id: "V001", name: "Swift Dzire", type: "Sedan", plate: "MH12AB1234", fuel: "Petrol", seats: 5 },
  { id: "V002", name: "Innova Crysta", type: "SUV", plate: "MH12CD5678", fuel: "Diesel", seats: 7 },
  { id: "V003", name: "Maruti Ertiga", type: "MPV", plate: "MH12EF9012", fuel: "Petrol", seats: 7 },
  { id: "V004", name: "Tata Nexon", type: "SUV", plate: "MH12GH3456", fuel: "Electric", seats: 5 },
  { id: "V005", name: "Honda Activa", type: "Scooter", plate: "MH12IJ7890", fuel: "Petrol", seats: 2 },
  { id: "V006", name: "Royal Enfield", type: "Bike", plate: "MH12KL2345", fuel: "Petrol", seats: 2 },
];

const STATUS = { AVAILABLE: "available", ON_TRIP: "on_trip", RETURNED: "returned" };

const COLORS = {
  available: { bg: "#e6f7f2", text: "#0d7a5f", dot: "#16a34a" },
  on_trip: { bg: "#fff7ed", text: "#9a3412", dot: "#ea580c" },
  returned: { bg: "#f0f4ff", text: "#1e40af", dot: "#3b82f6" },
};

function stamp() { return new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function today() { return new Date().toISOString().split("T")[0]; }

const STORAGE_KEY = "vr_trips_v1";

function loadTrips() {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : []; } catch { return []; }
}
function saveTrips(trips) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trips)); } catch {}
}

export default function App() {
  const [trips, setTrips] = useState(loadTrips);
  const [view, setView] = useState("dashboard"); // dashboard | new | active | history | print
  const [printTrip, setPrintTrip] = useState(null);
  const [returnTrip, setReturnTrip] = useState(null);
  const [form, setForm] = useState({
    customerName: "", phone: "", email: "", aadhaar: "", licence: "",
    vehicleId: "", fromPlace: "", toPlace: "", startDate: today(), startOdo: "", deposit: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [returnForm, setReturnForm] = useState({ endOdo: "", fuelStatus: "Full", remarks: "", endDate: today() });
  const printRef = useRef();

  useEffect(() => { saveTrips(trips); }, [trips]);
  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  const activeTrips = trips.filter(t => t.status === STATUS.ON_TRIP);
  const usedVehicleIds = activeTrips.map(t => t.vehicleId);
  const availableVehicles = VEHICLES.filter(v => !usedVehicleIds.includes(v.id));

  function validate() {
    const e = {};
    if (!form.customerName.trim()) e.customerName = "Required";
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Valid 10-digit mobile required";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    if (!/^\d{12}$/.test(form.aadhaar.replace(/\s/g, ""))) e.aadhaar = "12-digit Aadhaar required";
    if (!form.licence.trim()) e.licence = "Required";
    if (!form.vehicleId) e.vehicleId = "Select a vehicle";
    if (!form.fromPlace.trim()) e.fromPlace = "Required";
    if (!form.toPlace.trim()) e.toPlace = "Required";
    if (!form.startDate) e.startDate = "Required";
    if (!form.startOdo || isNaN(form.startOdo)) e.startOdo = "Valid odometer reading required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNew(e) {
    e.preventDefault();
    if (!validate()) return;
    const vehicle = VEHICLES.find(v => v.id === form.vehicleId);
    const trip = {
      id: "TR" + Date.now(),
      ...form,
      vehicleName: vehicle.name,
      vehiclePlate: vehicle.plate,
      vehicleType: vehicle.type,
      status: STATUS.ON_TRIP,
      createdAt: stamp(),
      startDate: form.startDate,
    };
    setTrips(prev => [trip, ...prev]);
    setPrintTrip(trip);
    setView("print");
    setToast("Trip created! Document ready to print.");
    setForm({ customerName: "", phone: "", email: "", aadhaar: "", licence: "", vehicleId: "", fromPlace: "", toPlace: "", startDate: today(), startOdo: "", deposit: "", notes: "" });
    setErrors({});
  }

  function handleReturn(e) {
    e.preventDefault();
    if (!returnForm.endOdo || isNaN(returnForm.endOdo)) { setErrors({ endOdo: "Required" }); return; }
    const km = parseInt(returnForm.endOdo) - parseInt(returnTrip.startOdo);
    const updated = {
      ...returnTrip,
      ...returnForm,
      status: STATUS.RETURNED,
      returnedAt: stamp(),
      kmDriven: km >= 0 ? km : 0,
    };
    setTrips(prev => prev.map(t => t.id === returnTrip.id ? updated : t));
    setPrintTrip(updated);
    setReturnTrip(null);
    setReturnForm({ endOdo: "", fuelStatus: "Full", remarks: "", endDate: today() });
    setErrors({});
    setView("print");
    setToast("Vehicle returned. Closure document ready.");
  }

  function handlePrint() {
    const content = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Trip Document</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',sans-serif;font-size:13px;color:#1a1a1a;background:#fff;padding:32px}
      .doc{max-width:720px;margin:0 auto;border:1px solid #ccc;border-radius:8px;overflow:hidden}
      .doc-header{background:#1e3a8a;color:#fff;padding:24px 28px;display:flex;justify-content:space-between;align-items:center}
      .doc-header h1{font-size:22px;font-weight:700;letter-spacing:-0.5px}
      .doc-header p{font-size:12px;opacity:0.8;margin-top:2px}
      .doc-body{padding:24px 28px}
      .trip-id{display:inline-block;background:#e8f0fe;color:#1e3a8a;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:16px}
      .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:18px 0 12px}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .field{margin-bottom:8px}
      .field label{font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:2px}
      .field span{font-size:13px;font-weight:500;color:#111}
      .sign-row{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb}
      .sign-box{border-bottom:1px solid #111;padding-bottom:4px;height:50px}
      .sign-label{font-size:10px;color:#6b7280;margin-top:6px}
      .terms{font-size:10px;color:#6b7280;margin-top:18px;padding:12px;background:#f9fafb;border-radius:6px;line-height:1.6}
      .status-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
      .status-on{background:#fff7ed;color:#9a3412}
      .status-ret{background:#e6f7f2;color:#0d7a5f}
      @media print{body{padding:0}.doc{border:none;border-radius:0}}
    </style></head><body>${content}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }

  const Field = ({ label, value, col }) => (
    <div className="field" style={{ gridColumn: col }}>
      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{value || "—"}</div>
    </div>
  );

  // ---- PRINT VIEW ----
  if (view === "print" && printTrip) {
    const isReturn = printTrip.status === STATUS.RETURNED;
    return (
      <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f8fafc", minHeight: "100vh", padding: 24 }}>
        {toast && <Toast msg={toast} />}
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
            <button onClick={() => setView("dashboard")} style={btnStyle()}>← Back to dashboard</button>
            <button onClick={handlePrint} style={btnStyle("#1e3a8a", "#fff")}>
              🖨 Print / Download PDF
            </button>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
              {isReturn ? "Vehicle Return Document" : "Vehicle Handover Document"}
            </span>
          </div>

          <div ref={printRef} className="doc" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ background: "#1e3a8a", color: "#fff", padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>🚗 YatraWheels</div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>Vehicle Rental Services · Est. 2018</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{isReturn ? "RETURN DOCUMENT" : "RENTAL AGREEMENT"}</div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{printTrip.createdAt}</div>
              </div>
            </div>

            <div style={{ padding: "22px 28px" }}>
              <div style={{ display: "inline-block", background: "#e8f0fe", color: "#1e3a8a", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 16 }}>
                Trip ID: {printTrip.id}
              </div>
              {isReturn && <span style={{ marginLeft: 10, background: "#e6f7f2", color: "#0d7a5f", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>TRIP CLOSED</span>}
              {!isReturn && <span style={{ marginLeft: 10, background: "#fff7ed", color: "#9a3412", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>ACTIVE RENTAL</span>}

              <SectionTitle>Customer Details</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
                <DocField label="Full Name" value={printTrip.customerName} />
                <DocField label="Mobile" value={printTrip.phone} />
                <DocField label="Email" value={printTrip.email} />
                <DocField label="Aadhaar No." value={printTrip.aadhaar} />
                <DocField label="Driving Licence No." value={printTrip.licence} />
              </div>

              <SectionTitle>Vehicle Details</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
                <DocField label="Vehicle" value={`${printTrip.vehicleName} (${printTrip.vehicleType})`} />
                <DocField label="Registration No." value={printTrip.vehiclePlate} />
                <DocField label="From" value={printTrip.fromPlace} />
                <DocField label="To" value={printTrip.toPlace} />
                <DocField label="Start Date" value={printTrip.startDate} />
                <DocField label="Odometer (Start)" value={printTrip.startOdo + " km"} />
                {printTrip.deposit && <DocField label="Security Deposit" value={"₹" + printTrip.deposit} />}
              </div>

              {isReturn && (
                <>
                  <SectionTitle>Return Details</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
                    <DocField label="Return Date" value={printTrip.endDate} />
                    <DocField label="Odometer (Return)" value={printTrip.endOdo + " km"} />
                    <DocField label="Total KM Driven" value={printTrip.kmDriven + " km"} />
                    <DocField label="Fuel Status on Return" value={printTrip.fuelStatus} />
                    {printTrip.remarks && <DocField label="Remarks" value={printTrip.remarks} col="span 2" />}
                  </div>
                </>
              )}

              {printTrip.notes && (
                <div style={{ marginTop: 14, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 7, fontSize: 12, color: "#78350f" }}>
                  <strong>Notes:</strong> {printTrip.notes}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 32, paddingTop: 20, borderTop: "1px solid #e5e7eb" }}>
                <div>
                  <div style={{ borderBottom: "1px solid #111", height: 44 }}></div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 5 }}>Customer Signature</div>
                </div>
                <div>
                  <div style={{ borderBottom: "1px solid #111", height: 44 }}></div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 5 }}>Authorised by (YatraWheels)</div>
                </div>
              </div>

              <div style={{ marginTop: 18, padding: "10px 14px", background: "#f8fafc", borderRadius: 7, fontSize: 10, color: "#6b7280", lineHeight: 1.7 }}>
                <strong>Terms:</strong> The customer agrees to return the vehicle in the same condition as received. Any damage, traffic violations, or fuel shortfall will be charged to the customer. Security deposit is refundable upon satisfactory return. This document serves as a binding rental agreement between the customer and YatraWheels.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- RETURN MODAL ----
  const ReturnModal = () => returnTrip ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 440, maxWidth: "95vw" }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Return Vehicle</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>
          {returnTrip.vehicleName} · {returnTrip.customerName}
        </div>
        <form onSubmit={handleReturn}>
          <FInput label="Return Date" type="date" value={returnForm.endDate} onChange={v => setReturnForm(p => ({ ...p, endDate: v }))} />
          <FInput label="Odometer Reading at Return (km)" type="number" value={returnForm.endOdo} onChange={v => setReturnForm(p => ({ ...p, endOdo: v }))} error={errors.endOdo} />
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Fuel Status</label>
            <select value={returnForm.fuelStatus} onChange={e => setReturnForm(p => ({ ...p, fuelStatus: e.target.value }))} style={inputStyle()}>
              {["Full", "3/4", "1/2", "1/4", "Empty"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <FInput label="Remarks / Damage Notes (optional)" value={returnForm.remarks} onChange={v => setReturnForm(p => ({ ...p, remarks: v }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => { setReturnTrip(null); setErrors({}); }} style={{ ...btnStyle(), flex: 1 }}>Cancel</button>
            <button type="submit" style={{ ...btnStyle("#0d7a5f", "#fff"), flex: 1 }}>Complete Return</button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  // ---- MAIN VIEWS ----
  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f1f5f9", minHeight: "100vh", color: "#1a202c" }}>
      {toast && <Toast msg={toast} />}
      <ReturnModal />

      {/* HEADER */}
      <div style={{ background: "#1e3a8a", color: "#fff", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.2)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚗</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>YatraWheels</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Vehicle Rental Management</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["dashboard", "Dashboard"], ["new", "New Trip"], ["active", `Active (${activeTrips.length})`], ["history", "History"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: view === v ? "#fff" : "rgba(255,255,255,0.15)",
              color: view === v ? "#1e3a8a" : "#fff",
              transition: "all 0.15s"
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Total Trips", val: trips.length, color: "#1e3a8a", bg: "#e8f0fe" },
                { label: "Active Trips", val: activeTrips.length, color: "#9a3412", bg: "#fff7ed" },
                { label: "Vehicles Available", val: availableVehicles.length, color: "#0d7a5f", bg: "#e6f7f2" },
                { label: "Completed", val: trips.filter(t => t.status === STATUS.RETURNED).length, color: "#1e40af", bg: "#eff6ff" },
              ].map(c => (
                <div key={c.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{c.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: c.color }}>{c.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Fleet Status</div>
                {VEHICLES.map(v => {
                  const trip = activeTrips.find(t => t.vehicleId === v.id);
                  const status = trip ? STATUS.ON_TRIP : STATUS.AVAILABLE;
                  const c = COLORS[status];
                  return (
                    <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ width: 34, height: 34, background: c.bg, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                        {v.type === "Bike" || v.type === "Scooter" ? "🏍" : "🚗"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{v.name}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{v.plate} · {v.type}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, background: c.bg, color: c.text, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }}></div>
                        {status === STATUS.ON_TRIP ? `Out · ${trip.customerName.split(" ")[0]}` : "Available"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Recent Trips</div>
                {trips.slice(0, 6).map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                    onClick={() => { setPrintTrip(t); setView("print"); }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{t.customerName}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{t.vehicleName} · {t.fromPlace} → {t.toPlace}</div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
                {trips.length === 0 && <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: 24 }}>No trips yet. Create the first one!</div>}
              </div>
            </div>
          </div>
        )}

        {/* NEW TRIP FORM */}
        {view === "new" && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 28, maxWidth: 760, margin: "0 auto" }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>New Trip Registration</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Fill in customer and vehicle details to generate a rental agreement.</div>
            <form onSubmit={handleNew}>
              <SectionHead>Customer Information</SectionHead>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 6 }}>
                <FInput label="Full Name *" value={form.customerName} onChange={v => setForm(p => ({ ...p, customerName: v }))} error={errors.customerName} />
                <FInput label="Mobile Number *" type="tel" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} error={errors.phone} placeholder="10-digit mobile" />
                <FInput label="Email Address" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} error={errors.email} />
                <FInput label="Aadhaar Card Number *" value={form.aadhaar} onChange={v => setForm(p => ({ ...p, aadhaar: v }))} error={errors.aadhaar} placeholder="12 digits" />
                <FInput label="Driving Licence Number *" value={form.licence} onChange={v => setForm(p => ({ ...p, licence: v }))} error={errors.licence} />
              </div>

              <SectionHead>Vehicle & Trip Details</SectionHead>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Select Vehicle *</label>
                <select value={form.vehicleId} onChange={e => setForm(p => ({ ...p, vehicleId: e.target.value }))} style={inputStyle(errors.vehicleId)}>
                  <option value="">— Choose available vehicle —</option>
                  {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.type}) · {v.plate}</option>)}
                </select>
                {errors.vehicleId && <div style={errStyle}>{errors.vehicleId}</div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 6 }}>
                <FInput label="Starting From *" value={form.fromPlace} onChange={v => setForm(p => ({ ...p, fromPlace: v }))} error={errors.fromPlace} placeholder="City / Location" />
                <FInput label="Destination *" value={form.toPlace} onChange={v => setForm(p => ({ ...p, toPlace: v }))} error={errors.toPlace} placeholder="City / Location" />
                <FInput label="Start Date *" type="date" value={form.startDate} onChange={v => setForm(p => ({ ...p, startDate: v }))} error={errors.startDate} />
                <FInput label="Odometer Reading (km) *" type="number" value={form.startOdo} onChange={v => setForm(p => ({ ...p, startOdo: v }))} error={errors.startOdo} placeholder="Current odometer" />
                <FInput label="Security Deposit (₹)" type="number" value={form.deposit} onChange={v => setForm(p => ({ ...p, deposit: v }))} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Additional Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any special instructions, condition notes, etc."
                  style={{ ...inputStyle(), height: 72, resize: "vertical" }} />
              </div>
              <button type="submit" style={{ ...btnStyle("#1e3a8a", "#fff"), width: "100%", padding: "12px 0", fontSize: 14 }}>
                Create Trip &amp; Generate Document →
              </button>
            </form>
          </div>
        )}

        {/* ACTIVE TRIPS */}
        {view === "active" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Active Trips ({activeTrips.length})</div>
            {activeTrips.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, padding: 48, textAlign: "center", color: "#9ca3af", border: "1px solid #e2e8f0" }}>
                No active trips right now.
              </div>
            ) : activeTrips.map(t => (
              <TripCard key={t.id} trip={t} onReturn={() => setReturnTrip(t)} onView={() => { setPrintTrip(t); setView("print"); }} />
            ))}
          </div>
        )}

        {/* HISTORY */}
        {view === "history" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Trip History ({trips.length})</div>
            {trips.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, padding: 48, textAlign: "center", color: "#9ca3af", border: "1px solid #e2e8f0" }}>
                No trips recorded yet.
              </div>
            ) : trips.map(t => (
              <TripCard key={t.id} trip={t} onReturn={t.status === STATUS.ON_TRIP ? () => setReturnTrip(t) : null} onView={() => { setPrintTrip(t); setView("print"); }} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

function TripCard({ trip, onReturn, onView }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: "monospace", fontSize: 11, background: "#e8f0fe", color: "#1e3a8a", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{trip.id}</span>
            <StatusBadge status={trip.status} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{trip.customerName}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{trip.phone} · {trip.email}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{trip.vehicleName}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{trip.vehiclePlate}</div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 12, paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        <InfoChip icon="📍" label="From" val={trip.fromPlace} />
        <InfoChip icon="🏁" label="To" val={trip.toPlace} />
        <InfoChip icon="📅" label="Start" val={trip.startDate} />
        <InfoChip icon="🔢" label="Odo Start" val={trip.startOdo + " km"} />
        {trip.kmDriven !== undefined && <InfoChip icon="📏" label="KM Driven" val={trip.kmDriven + " km"} />}
        {trip.deposit && <InfoChip icon="💰" label="Deposit" val={"₹" + trip.deposit} />}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onView} style={btnStyle()}>View / Print Document</button>
        {onReturn && <button onClick={onReturn} style={btnStyle("#0d7a5f", "#fff")}>Complete Return →</button>}
      </div>
    </div>
  );
}

function InfoChip({ icon, label, val }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{icon} {label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 1 }}>{val}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const c = COLORS[status] || COLORS.available;
  const labels = { available: "Available", on_trip: "On Trip", returned: "Returned" };
  return (
    <span style={{ background: c.bg, color: c.text, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, display: "inline-block" }}></span>
      {labels[status]}
    </span>
  );
}

function SectionHead({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", borderBottom: "1px solid #e5e7eb", paddingBottom: 6, marginBottom: 14, marginTop: 20 }}>{children}</div>;
}
function SectionTitle({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#6b7280", borderBottom: "1px solid #e5e7eb", paddingBottom: 5, marginTop: 16, marginBottom: 10 }}>{children}</div>;
}
function DocField({ label, value, col }) {
  return (
    <div style={{ gridColumn: col }}>
      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{value || "—"}</div>
    </div>
  );
}
function Toast({ msg }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1e3a8a", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 999, maxWidth: 320 }}>
      ✓ {msg}
    </div>
  );
}

const labelStyle = { fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 5 };
const errStyle = { fontSize: 11, color: "#dc2626", marginTop: 4 };
const inputStyle = (err) => ({
  width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${err ? "#dc2626" : "#d1d5db"}`,
  fontSize: 13, outline: "none", background: "#fff", color: "#1a202c", fontFamily: "inherit",
});

function FInput({ label, value, onChange, error, type = "text", placeholder }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={inputStyle(error)} />
      {error && <div style={errStyle}>{error}</div>}
    </div>
  );
}

function btnStyle(bg = "#f1f5f9", color = "#1a202c") {
  return {
    padding: "8px 16px", borderRadius: 8, border: "none", background: bg, color, fontFamily: "inherit",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
  };
}
