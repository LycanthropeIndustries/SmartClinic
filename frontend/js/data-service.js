// ======================= CENTRALIZED DATA SERVICE =======================
class DataService {
  constructor() {
    this.data = {
      patients: [],
      doctors: [],
      nurses: [],
      appointments: [],
      queue: [],
      prescriptions: [],
      notifications: [],
      consultationDurations: [],
      systemSettings: {},
    };
    this.listeners = [];
    this.walkinCounter = 1;
    this.init();
  }

  async init() {
    // First, load from localStorage
    this.loadFromLocalStorage();

    // If no data exists, initialize with default data
    if (this.data.patients.length === 0) {
      this.initDefaultData();
    }

    // Try to load from JSON file (correct path - relative to root)
    await this.mergeFromJsonFile();

    this.ensureDataConsistency();

    // Save to localStorage to persist
    this.saveToLocalStorage();

    // Notify listeners
    setTimeout(() => {
      this.notifyListeners("all", this.data, "refresh");
    }, 100);
  }

  async mergeFromJsonFile() {
    try {
      // Try multiple possible paths
      let response = await fetch("database/models.json");
      if (!response.ok) {
        response = await fetch("../database/models.json");
      }
      if (!response.ok) {
        response = await fetch("/database/models.json");
      }
      if (response.ok) {
        const jsonData = await response.json();

        // Merge patients
        if (jsonData.patients && jsonData.patients.length) {
          for (const p of jsonData.patients) {
            if (
              !this.data.patients.find(
                (existing) => existing.patient_id === p.patient_id,
              )
            ) {
              this.data.patients.push({
                patient_id: p.patient_id,
                id: p.patient_id,
                full_name: p.full_name,
                name: p.full_name,
                id_number: p.id_number,
                dob: p.dob,
                contact: p.contact,
                email: p.email,
                prescriptions: [],
                created_at: p.created_at || new Date().toISOString(),
              });
            }
          }
        }

        // Merge doctors
        if (jsonData.doctors && jsonData.doctors.length) {
          for (const d of jsonData.doctors) {
            if (!this.data.doctors.find((existing) => existing.id === d.id)) {
              this.data.doctors.push({
                id: d.id,
                name: d.name,
                specialty: d.specialty,
                phone: d.phone,
                email: d.email,
                bio: d.bio,
                availability: d.availability || {},
              });
            }
          }
        }

        // Merge nurses
        if (jsonData.nurses && jsonData.nurses.length) {
          for (const n of jsonData.nurses) {
            if (!this.data.nurses.find((existing) => existing.id === n.id)) {
              this.data.nurses.push({
                id: n.id,
                name: n.name,
                specialty: n.specialty,
                phone: n.phone,
                email: n.email,
                bio: n.bio,
                duties: n.duties || [],
              });
            }
          }
        }

        // Merge appointments
        if (jsonData.appointments && jsonData.appointments.length) {
          for (const a of jsonData.appointments) {
            if (
              !this.data.appointments.find((existing) => existing.id === a.id)
            ) {
              this.data.appointments.push({
                id: a.id,
                patientId: a.patientId,
                patientName: a.patientName,
                doctor: a.doctorName,
                doctorName: a.doctorName,
                datetime: a.datetime,
                reason: a.reason,
                status: a.status || "upcoming",
                created_at: a.created_at || new Date().toISOString(),
              });
            }
          }
        }

        // Merge queue
        if (jsonData.queue && jsonData.queue.length) {
          for (const q of jsonData.queue) {
            if (!this.data.queue.find((existing) => existing.id === q.id)) {
              this.data.queue.push({
                id: q.id,
                position: q.position,
                patient_id: q.patient_id,
                patient_name: q.patient_name,
                status: q.status || "CheckedIn",
                checkin_time: q.checkin_time,
                priority: q.priority || "normal",
                vitals_done: q.vitals_done || false,
                type: q.type || "Check-in",
              });
            }
          }
        }

        console.log("JSON data merged successfully");
      } else {
        console.log("No JSON file found, using default data");
      }
    } catch (error) {
      console.log("Error loading JSON file:", error);
    }
  }

  initDefaultData() {
    this.data.patients = [
      {
        patient_id: "SC_001",
        id: "SC_001",
        full_name: "Zanele Dlamini",
        name: "Zanele Dlamini",
        id_number: "9001015800088",
        dob: "1990-01-01",
        contact: "073 456 7890",
        email: "zanele@smartclinic.co.za",
        prescriptions: [],
        created_at: new Date().toISOString(),
      },
      {
        patient_id: "SC_002",
        id: "SC_002",
        full_name: "Thabo Mokoena",
        name: "Thabo Mokoena",
        id_number: "9502025802086",
        dob: "1995-02-02",
        contact: "082 555 1234",
        email: "thabo@smartclinic.co.za",
        prescriptions: [],
        created_at: new Date().toISOString(),
      },
      {
        patient_id: "SC_003",
        id: "SC_003",
        full_name: "Lerato Khumalo",
        name: "Lerato Khumalo",
        id_number: "8803035803084",
        dob: "1988-03-03",
        contact: "071 234 5678",
        email: "lerato@smartclinic.co.za",
        prescriptions: [],
        created_at: new Date().toISOString(),
      },
    ];

    this.data.doctors = [
      {
        id: "doc1",
        name: "Dr M. Nkosi",
        specialty: "General Practice",
        phone: "011 234 5678",
        email: "nkosi@smartclinic.co.za",
        bio: "15+ years experience.",
        availability: {
          Monday: ["09:00", "11:00"],
          Tuesday: ["10:00", "14:00"],
          Wednesday: ["09:00"],
          Thursday: ["09:00", "15:00"],
          Friday: ["09:00"],
        },
      },
    ];

    this.data.nurses = [
      {
        id: "nurse1",
        name: "Nurse J. Molefe",
        specialty: "Registered Nurse",
        phone: "011 234 5681",
        email: "jmolefe@smartclinic.co.za",
        bio: "Dedicated to patient care.",
        duties: ["Vitals", "Triage", "Wound Care"],
      },
    ];

    this.data.appointments = [
      {
        id: "APT_001",
        patientId: "SC_001",
        patientName: "Zanele Dlamini",
        doctor: "Dr M. Nkosi",
        doctorName: "Dr M. Nkosi",
        datetime: "2026-06-20T10:00:00",
        reason: "Persistent cough",
        status: "upcoming",
        created_at: new Date().toISOString(),
      },
      {
        id: "APT_002",
        patientId: "SC_002",
        patientName: "Thabo Mokoena",
        doctor: "Dr M. Nkosi",
        doctorName: "Dr M. Nkosi",
        datetime: "2026-06-21T14:30:00",
        reason: "Hypertension follow-up",
        status: "upcoming",
        created_at: new Date().toISOString(),
      },
    ];

    this.data.queue = [
      {
        id: 1,
        position: 1,
        patient_id: "SC_001",
        patient_name: "Zanele Dlamini",
        status: "CheckedIn",
        checkin_time: new Date().toISOString(),
        priority: "normal",
        vitals_done: false,
        type: "Check-in",
      },
      {
        id: 2,
        position: 2,
        patient_id: "SC_002",
        patient_name: "Thabo Mokoena",
        status: "CheckedIn",
        checkin_time: new Date().toISOString(),
        priority: "urgent",
        vitals_done: false,
        type: "Check-in",
      },
    ];

    this.data.consultationDurations = [14, 22, 18];
    this.walkinCounter = 5;
  }

  loadFromLocalStorage() {
    try {
      let patients = localStorage.getItem("sc_db_patients");
      if (patients) this.data.patients = JSON.parse(patients);

      let doctors = localStorage.getItem("smartclinic_doctors");
      if (doctors) this.data.doctors = JSON.parse(doctors);

      let nurses = localStorage.getItem("sc_nurses");
      if (nurses) this.data.nurses = JSON.parse(nurses);

      let appointments = localStorage.getItem("sc_db_appointments");
      if (appointments) this.data.appointments = JSON.parse(appointments);

      let queue = localStorage.getItem("sc_db_queue");
      if (queue) this.data.queue = JSON.parse(queue);

      let prescriptions = localStorage.getItem("sc_prescriptions");
      if (prescriptions) this.data.prescriptions = JSON.parse(prescriptions);

      let notifications = localStorage.getItem("sc_db_notifications");
      if (notifications) this.data.notifications = JSON.parse(notifications);

      let durations = localStorage.getItem("sc_durations");
      if (durations) this.data.consultationDurations = JSON.parse(durations);

      let walkinCounter = localStorage.getItem("sc_walkin_counter");
      if (walkinCounter) this.walkinCounter = parseInt(walkinCounter);
    } catch (e) {
      console.error("Error loading from localStorage:", e);
    }
  }

  ensureDataConsistency() {
    // Ensure all patients have required fields
    this.data.patients.forEach((p) => {
      if (!p.prescriptions) p.prescriptions = [];
      if (!p.id) p.id = p.patient_id;
      if (!p.name) p.name = p.full_name;
    });

    // Sort queue by position
    this.data.queue.sort((a, b) => (a.position || 0) - (b.position || 0));

    // Fix queue items
    this.data.queue.forEach((q, idx) => {
      if (!q.position) q.position = idx + 1;
      if (!q.type) q.type = "Check-in";
      if (!q.status) q.status = "CheckedIn";

      // Find patient name if missing
      if ((!q.patient_name || q.patient_name === "undefined") && q.patient_id) {
        const patient = this.data.patients.find(
          (p) => p.patient_id === q.patient_id || p.id === q.patient_id,
        );
        if (patient) {
          q.patient_name = patient.full_name || patient.name;
        }
      }
    });

    // Fix appointment status display
    this.data.appointments.forEach((a) => {
      if (!a.doctor && a.doctorName) a.doctor = a.doctorName;
      if (!a.doctorName && a.doctor) a.doctorName = a.doctor;
    });
  }

  saveToLocalStorage() {
    localStorage.setItem("sc_db_patients", JSON.stringify(this.data.patients));
    localStorage.setItem(
      "smartclinic_patients",
      JSON.stringify(this.data.patients),
    );
    localStorage.setItem(
      "smartclinic_doctors",
      JSON.stringify(this.data.doctors),
    );
    localStorage.setItem("sc_nurses", JSON.stringify(this.data.nurses));
    localStorage.setItem(
      "sc_db_appointments",
      JSON.stringify(this.data.appointments),
    );
    localStorage.setItem(
      "sc_appointments",
      JSON.stringify(this.data.appointments),
    );
    localStorage.setItem("sc_db_queue", JSON.stringify(this.data.queue));
    localStorage.setItem("sc_queue", JSON.stringify(this.data.queue));
    localStorage.setItem(
      "sc_prescriptions",
      JSON.stringify(this.data.prescriptions),
    );
    localStorage.setItem(
      "sc_db_notifications",
      JSON.stringify(this.data.notifications),
    );
    localStorage.setItem(
      "sc_notifications",
      JSON.stringify(this.data.notifications),
    );
    localStorage.setItem(
      "sc_durations",
      JSON.stringify(this.data.consultationDurations),
    );
    localStorage.setItem("sc_walkin_counter", this.walkinCounter.toString());

    this.notifyListeners("all", this.data, "update");
  }

  // CRUD Operations
  getPatients() {
    return this.data.patients;
  }
  getPatient(id) {
    return this.data.patients.find((p) => p.patient_id === id || p.id === id);
  }

  addPatient(patient) {
    const nextId = this.data.patients.length + 1;
    const patientId = `SC_${String(nextId).padStart(3, "0")}`;
    const newPatient = {
      patient_id: patientId,
      id: patientId,
      full_name: patient.full_name || patient.name,
      name: patient.full_name || patient.name,
      id_number: patient.id_number,
      contact: patient.contact,
      email: patient.email,
      created_at: new Date().toISOString(),
      prescriptions: [],
    };
    this.data.patients.push(newPatient);
    this.saveToLocalStorage();
    this.notifyListeners("patients", newPatient);
    return newPatient;
  }

  getDoctors() {
    return this.data.doctors;
  }
  getDoctor(id) {
    return this.data.doctors.find((d) => d.id === id);
  }

  updateDoctor(id, updates) {
    const index = this.data.doctors.findIndex((d) => d.id === id);
    if (index !== -1) {
      this.data.doctors[index] = { ...this.data.doctors[index], ...updates };
      this.saveToLocalStorage();
      this.notifyListeners("doctors", this.data.doctors[index]);
      return this.data.doctors[index];
    }
    return null;
  }

  getNurses() {
    return this.data.nurses;
  }
  getNurse(id) {
    return this.data.nurses.find((n) => n.id === id);
  }

  getAppointments() {
    return this.data.appointments;
  }
  getAppointmentsForPatient(patientId) {
    return this.data.appointments.filter((a) => a.patientId === patientId);
  }
  getAppointmentsForDoctor(doctorName) {
    return this.data.appointments.filter(
      (a) => a.doctor === doctorName || a.doctorName === doctorName,
    );
  }

  addAppointment(appointment) {
    const newAppt = {
      ...appointment,
      id: `APT_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.data.appointments.push(newAppt);
    this.saveToLocalStorage();
    this.addNotification(
      appointment.patientId,
      `Appointment booked with ${appointment.doctorName} on ${new Date(appointment.datetime).toLocaleString()}`,
      "appointment",
    );
    this.notifyListeners("appointments", newAppt);
    return newAppt;
  }

  getQueue() {
    return this.data.queue;
  }

  addToQueue(patient, type) {
    const position = this.data.queue.length + 1;
    const patientId = patient.patient_id || patient.id;
    const patientName = patient.full_name || patient.name;

    const entry = {
      id: Date.now(),
      position: position,
      patient_id: patientId,
      patient_name: patientName,
      status: "CheckedIn",
      checkin_time: new Date().toISOString(),
      priority: "normal",
      vitals_done: false,
      type: type,
    };
    this.data.queue.push(entry);
    this.saveToLocalStorage();
    this.addNotification(
      patientId,
      `You have been checked in. Queue position: ${position}`,
      "queue",
    );
    this.notifyListeners("queue", entry);
    return entry;
  }

  updateQueueEntry(id, updates) {
    const index = this.data.queue.findIndex((q) => q.id === id);
    if (index !== -1) {
      this.data.queue[index] = { ...this.data.queue[index], ...updates };
      this.saveToLocalStorage();
      this.notifyListeners("queue", this.data.queue[index]);
      return this.data.queue[index];
    }
    return null;
  }

  removeFromQueue(id) {
    const index = this.data.queue.findIndex((q) => q.id === id);
    if (index !== -1) {
      const removed = this.data.queue.splice(index, 1)[0];
      this.data.queue.forEach((q, i) => {
        q.position = i + 1;
      });
      this.saveToLocalStorage();
      this.notifyListeners("queue", null, "remove");
      return removed;
    }
    return null;
  }

  getPrescriptions() {
    return this.data.prescriptions;
  }
  getPrescriptionsForPatient(patientId) {
    return this.data.prescriptions.filter((p) => p.patientId === patientId);
  }

  addPrescription(prescription) {
    const newRx = {
      ...prescription,
      id: `RX_${Date.now()}`,
      date: new Date().toISOString(),
    };
    this.data.prescriptions.push(newRx);
    this.saveToLocalStorage();
    this.addNotification(
      prescription.patientId,
      `New prescription issued by ${prescription.doctorName}`,
      "prescription",
    );
    this.notifyListeners("prescriptions", newRx);
    return newRx;
  }

  getNotifications(patientId) {
    if (patientId)
      return this.data.notifications.filter((n) => n.patientId === patientId);
    return this.data.notifications;
  }

  addNotification(patientId, message, type) {
    const notification = {
      id: `NOTIF_${Date.now()}`,
      patientId: patientId,
      message: message,
      type: type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(notification);
    this.saveToLocalStorage();
    this.notifyListeners("notifications", notification);
    return notification;
  }

  getConsultationDurations() {
    return this.data.consultationDurations;
  }
  addConsultationDuration(duration) {
    this.data.consultationDurations.push(duration);
    this.saveToLocalStorage();
    this.notifyListeners("consultationDurations", duration);
  }

  getSystemSettings() {
    return this.data.systemSettings;
  }
  getWalkinCounter() {
    return this.walkinCounter;
  }
  incrementWalkinCounter() {
    this.walkinCounter++;
    this.saveToLocalStorage();
    return this.walkinCounter;
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) this.listeners.splice(index, 1);
  }

  notifyListeners(entity, data, action = "update") {
    this.listeners.forEach((callback) => callback({ entity, data, action }));
  }
}

const dataService = new DataService();
