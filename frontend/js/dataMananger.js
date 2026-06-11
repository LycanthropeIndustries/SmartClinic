// ======================= SHARED DATA MANAGER =======================
// This file serves as the central data hub for the entire SmartClinic system
// All pages (Doctor, Nurse, Terminal) read/write from this single source

const DataManager = {
    // Database configuration (MySQL / Supabase)
    config: {
        // Supabase configuration (replace with your actual credentials)
        supabaseUrl: 'https://your-project.supabase.co',
        supabaseAnonKey: 'your-anon-key',
        
        // MySQL API endpoint (if using custom backend)
        mysqlApiEndpoint: '/api/sync',
        
        useCloud: false, // Set to true to enable cloud sync
        syncInterval: 30000 // Sync every 30 seconds
    },
    
    // In-memory data cache
    cache: {
        patients: [],
        doctors: [],
        nurses: [],
        appointments: [],
        queue: [],
        notifications: [],
        prescriptions: [],
        duties: [],
        consultationDurations: [],
        predictionLogs: [],
        ticketCounter: 1,
        lastSync: null
    },
    
    // Initialize the data manager
    async init() {
        await this.loadFromLocal();
        if (this.config.useCloud) {
            await this.syncWithCloud();
            this.startAutoSync();
        }
        console.log('DataManager initialized', this.cache);
    },
    
    // Load from localStorage (primary offline storage)
    loadFromLocal() {
        const keys = ['patients', 'doctors', 'nurses', 'appointments', 'queue', 
                      'notifications', 'prescriptions', 'duties', 'consultationDurations', 
                      'predictionLogs', 'ticketCounter'];
        
        for (const key of keys) {
            const data = localStorage.getItem(`smartclinic_${key}`);
            if (data) {
                this.cache[key] = JSON.parse(data);
            }
        }
        
        // Initialize default data if empty
        if (this.cache.patients.length === 0) {
            this.initDefaultData();
        }
        
        return this.cache;
    },
    
    // Initialize default demo data
    initDefaultData() {
        this.cache.patients = [
            { id: "SC-001", name: "Zanele Dlamini", id_number: "9001015800088", dob: "1990-01-01", contact: "073 456 7890", email: "zanele@email.com", prescriptions: [], created_at: new Date().toISOString() },
            { id: "SC-002", name: "Thabo Mokoena", id_number: "9502025802086", dob: "1995-02-02", contact: "082 555 1234", email: "thabo@email.com", prescriptions: [], created_at: new Date().toISOString() },
            { id: "SC-003", name: "Lerato Khumalo", id_number: "8803035803084", dob: "1988-03-03", contact: "071 234 5678", email: "lerato@email.com", prescriptions: [], created_at: new Date().toISOString() }
        ];
        
        this.cache.doctors = [
            { id: "doc1", name: "Dr M. Nkosi", specialty: "General Practice", phone: "011 234 5678", email: "nkosi@smartclinic.co.za", bio: "15+ years experience.", photoData: null, availability: { Monday: ["09:00", "11:00"], Tuesday: ["10:00", "14:00"], Wednesday: ["09:00"], Thursday: ["09:00", "15:00"], Friday: ["09:00"] } },
            { id: "doc2", name: "Dr R. Patel", specialty: "Pediatrics", phone: "011 234 5679", email: "patel@smartclinic.co.za", bio: "Child health specialist.", photoData: null, availability: {} },
            { id: "doc3", name: "Dr S. Williams", specialty: "Internal Medicine", phone: "011 234 5680", email: "williams@smartclinic.co.za", bio: "Chronic disease management.", photoData: null, availability: {} }
        ];
        
        this.cache.nurses = [
            { id: "nurse1", name: "Nurse J. Molefe", specialty: "Registered Nurse", phone: "011 234 5681", email: "jmolefe@clinic.co.za", bio: "Dedicated to patient care.", photoData: null, duties: ["Vitals", "Triage", "Wound Care"] },
            { id: "nurse2", name: "Nurse P. Dube", specialty: "Clinical Nurse", phone: "011 234 5682", email: "pdube@clinic.co.za", bio: "Medication prep & education.", photoData: null, duties: ["Vitals", "Medication Prep"] }
        ];
        
        this.cache.appointments = [
            { id: "A1", patientId: "SC-001", patientName: "Zanele Dlamini", doctor: "Dr M. Nkosi", datetime: new Date(Date.now() + 86400000).toISOString(), reason: "Follow-up", status: "upcoming", createdAt: new Date().toISOString() }
        ];
        
        this.cache.queue = [
            { id: 1, patient_id: "SC-001", patient_name: "Zanele Dlamini", status: "CheckedIn", checkin_time: Date.now() - 300000, priority: "normal", vitals_done: false },
            { id: 2, patient_id: "SC-002", patient_name: "Thabo Mokoena", status: "CheckedIn", checkin_time: Date.now() - 600000, priority: "urgent", vitals_done: false }
        ];
        
        this.cache.notifications = [];
        this.cache.prescriptions = [];
        this.cache.duties = [];
        this.cache.consultationDurations = [14, 22];
        this.cache.predictionLogs = [
            { patient: "Zanele Dlamini", estimated: 15, actual: 14 },
            { patient: "Thabo Mokoena", estimated: 30, actual: 28 }
        ];
        this.cache.ticketCounter = 100;
        
        this.saveToLocal();
    },
    
    // Save to localStorage
    saveToLocal() {
        for (const [key, value] of Object.entries(this.cache)) {
            if (key !== 'lastSync') {
                localStorage.setItem(`smartclinic_${key}`, JSON.stringify(value));
            }
        }
        // Dispatch custom event to notify other tabs/windows
        window.dispatchEvent(new CustomEvent('smartclinic-data-updated', { detail: { cache: this.cache } }));
    },
    
    // Sync with cloud (Supabase/MySQL)
    async syncWithCloud() {
        if (!this.config.useCloud) return;
        
        try {
            // Supabase sync example
            if (this.config.supabaseUrl && this.config.supabaseAnonKey) {
                // Load from Supabase
                const supabaseData = await this.fetchFromSupabase();
                if (supabaseData) {
                    Object.assign(this.cache, supabaseData);
                    this.saveToLocal();
                }
                
                // Push local changes to Supabase
                await this.pushToSupabase();
            }
            
            // MySQL API sync
            if (this.config.mysqlApiEndpoint) {
                const response = await fetch(`${this.config.mysqlApiEndpoint}/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: this.cache, timestamp: Date.now() })
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.data) Object.assign(this.cache, result.data);
                }
            }
            
            this.cache.lastSync = new Date().toISOString();
            this.saveToLocal();
            console.log('Cloud sync completed');
        } catch (error) {
            console.error('Cloud sync failed:', error);
        }
    },
    
    async fetchFromSupabase() {
        // Implement Supabase fetch based on your schema
        // This is a placeholder - replace with actual Supabase calls
        return null;
    },
    
    async pushToSupabase() {
        // Implement Supabase push based on your schema
        // This is a placeholder - replace with actual Supabase calls
        return null;
    },
    
    startAutoSync() {
        setInterval(() => {
            this.syncWithCloud();
        }, this.config.syncInterval);
    },
    
    // ======================= CRUD OPERATIONS =======================
    
    // Patients
    getPatients() { return [...this.cache.patients]; }
    getPatientById(id) { return this.cache.patients.find(p => p.id === id); }
    addPatient(patient) {
        const newId = `SC-${String(this.cache.patients.length + 1).padStart(3, '0')}`;
        const newPatient = { ...patient, id: newId, created_at: new Date().toISOString(), prescriptions: [] };
        this.cache.patients.push(newPatient);
        this.saveToLocal();
        this.syncWithCloud();
        return newPatient;
    }
    updatePatient(id, updates) {
        const index = this.cache.patients.findIndex(p => p.id === id);
        if (index !== -1) {
            this.cache.patients[index] = { ...this.cache.patients[index], ...updates };
            this.saveToLocal();
            this.syncWithCloud();
            return this.cache.patients[index];
        }
        return null;
    }
    
    // Appointments
    getAppointments() { return [...this.cache.appointments]; }
    getAppointmentsByPatient(patientId) { return this.cache.appointments.filter(a => a.patientId === patientId); }
    addAppointment(appointment) {
        const newAppt = { id: `APT${Date.now()}`, ...appointment, createdAt: new Date().toISOString(), status: 'upcoming' };
        this.cache.appointments.push(newAppt);
        this.addNotification(appointment.patientId, `Appointment booked with ${appointment.doctor} on ${new Date(appointment.datetime).toLocaleString()}`, 'appointment');
        this.saveToLocal();
        this.syncWithCloud();
        return newAppt;
    }
    
    // Queue
    getQueue() { return [...this.cache.queue]; }
    addToQueue(patientId, patientName, type) {
        const position = this.cache.queue.length + 1;
        const entry = { id: Date.now(), patient_id: patientId, patient_name: patientName, status: 'CheckedIn', checkin_time: Date.now(), priority: 'normal', vitals_done: false, type };
        this.cache.queue.push(entry);
        this.addNotification(patientId, `You have been checked in. Queue position: #${position}`, 'queue');
        this.saveToLocal();
        this.syncWithCloud();
        return entry;
    }
    updateQueueStatus(entryId, status) {
        const entry = this.cache.queue.find(q => q.id === entryId);
        if (entry) {
            entry.status = status;
            this.saveToLocal();
            this.syncWithCloud();
        }
    }
    
    // Prescriptions
    getPrescriptions() { return this.cache.prescriptions; }
    addPrescription(patientId, prescription) {
        const newRx = { id: `RX${Date.now()}`, patientId, ...prescription, date: new Date().toISOString(), status: 'active' };
        this.cache.prescriptions.push(newRx);
        
        // Also add to patient's prescriptions array
        const patient = this.getPatientById(patientId);
        if (patient) {
            if (!patient.prescriptions) patient.prescriptions = [];
            patient.prescriptions.push(newRx);
            this.updatePatient(patientId, { prescriptions: patient.prescriptions });
        }
        
        this.addNotification(patientId, `New prescription issued: ${prescription.medication}`, 'prescription');
        this.saveToLocal();
        this.syncWithCloud();
        return newRx;
    }
    
    // Notifications
    getNotifications(patientId = null) {
        if (patientId) return this.cache.notifications.filter(n => n.patientId === patientId);
        return [...this.cache.notifications];
    }
    addNotification(patientId, message, type) {
        const notif = { id: `NOTIF${Date.now()}`, patientId, message, type, read: false, createdAt: new Date().toISOString() };
        this.cache.notifications.unshift(notif);
        this.saveToLocal();
        this.syncWithCloud();
        return notif;
    }
    markNotificationRead(notifId) {
        const notif = this.cache.notifications.find(n => n.id === notifId);
        if (notif) notif.read = true;
        this.saveToLocal();
    }
    
    // Nurse Duties
    getDuties() { return [...this.cache.duties]; }
    addDuty(duty) {
        const newDuty = { id: `DUTY${Date.now()}`, ...duty, timestamp: new Date().toISOString() };
        this.cache.duties.unshift(newDuty);
        if (duty.patientId) {
            this.addNotification(duty.patientId, duty.task, 'duty');
        }
        this.saveToLocal();
        this.syncWithCloud();
        return newDuty;
    }
    
    // Consultation Analytics
    addConsultationDuration(duration, patientName) {
        this.cache.consultationDurations.push(duration);
        this.cache.predictionLogs.unshift({ patient: patientName, estimated: 15, actual: duration });
        this.saveToLocal();
    }
    
    getConsultationStats() {
        const durations = this.cache.consultationDurations;
        const avg = durations.length ? Math.round(durations.reduce((a,b) => a + b, 0) / durations.length) : 15;
        const total = durations.length;
        return { avg, total };
    },
    
    // Doctors
    getDoctors() { return [...this.cache.doctors]; }
    getDoctorById(id) { return this.cache.doctors.find(d => d.id === id); }
    updateDoctor(id, updates) {
        const index = this.cache.doctors.findIndex(d => d.id === id);
        if (index !== -1) {
            this.cache.doctors[index] = { ...this.cache.doctors[index], ...updates };
            this.saveToLocal();
            this.syncWithCloud();
            return this.cache.doctors[index];
        }
        return null;
    }
    
    // Nurses
    getNurses() { return [...this.cache.nurses]; }
    getNurseById(id) { return this.cache.nurses.find(n => n.id === id); }
    updateNurse(id, updates) {
        const index = this.cache.nurses.findIndex(n => n.id === id);
        if (index !== -1) {
            this.cache.nurses[index] = { ...this.cache.nurses[index], ...updates };
            this.saveToLocal();
            this.syncWithCloud();
            return this.cache.nurses[index];
        }
        return null;
    },
    
    // Ticket Counter
    getNextTicket() {
        const ticket = this.cache.ticketCounter;
        this.cache.ticketCounter++;
        this.saveToLocal();
        return `W${String(ticket).padStart(3, '0')}`;
    },
    
    // Subscribe to data changes
    subscribe(callback) {
        window.addEventListener('smartclinic-data-updated', (event) => {
            callback(event.detail.cache);
        });
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    DataManager.init();
});

// Export for use in other files
window.DataManager = DataManager;