import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Camera, 
  CheckCircle, 
  XCircle, 
  Search, 
  ShieldCheck, 
  X,
  Upload
} from 'lucide-react';
import { api } from '../api';

export default function StudentsAndClasses() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [showClassModal, setShowClassModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceModalStudent, setFaceModalStudent] = useState(null);

  // Class Form
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [classSubject, setClassSubject] = useState('');

  // Student Form
  const [stuId, setStuId] = useState('');
  const [stuName, setStuName] = useState('');
  const [stuEmail, setStuEmail] = useState('');

  // Load Classes
  const loadClasses = async () => {
    try {
      const res = await api.getClasses();
      setClasses(res);
      if (res.length > 0 && !selectedClassId) {
        setSelectedClassId(res[0].id);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  // Load Students
  const loadStudents = async (cId) => {
    if (!cId) return;
    try {
      setLoading(true);
      const res = await api.getStudents(cId);
      setStudents(res);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadStudents(selectedClassId);
    }
  }, [selectedClassId]);

  // Create Class
  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const created = await api.createClass({
        name: className,
        code: classCode,
        subject: classSubject
      });
      setShowClassModal(false);
      setClassName('');
      setClassCode('');
      setClassSubject('');
      await loadClasses();
      setSelectedClassId(created.id);
    } catch (err) {
      alert('Error creating class: ' + err.message);
    }
  };

  // Delete Class
  const handleDeleteClass = async (id) => {
    if (!window.confirm('Are you sure you want to delete this class and all associated students?')) return;
    try {
      await api.deleteClass(id);
      setSelectedClassId(null);
      await loadClasses();
    } catch (err) {
      alert('Error deleting class: ' + err.message);
    }
  };

  // Create Student
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!selectedClassId) return;
    try {
      await api.createStudent({
        student_id: stuId,
        full_name: stuName,
        email: stuEmail,
        class_id: selectedClassId,
        consent_given: true
      });
      setShowStudentModal(false);
      setStuId('');
      setStuName('');
      setStuEmail('');
      loadStudents(selectedClassId);
    } catch (err) {
      alert('Error adding student: ' + err.message);
    }
  };

  // Delete Student
  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try {
      await api.deleteStudent(id);
      loadStudents(selectedClassId);
    } catch (err) {
      alert('Error deleting student: ' + err.message);
    }
  };

  // Upload/Register Face
  const handleFaceUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !faceModalStudent) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.registerStudentFace(faceModalStudent.id, reader.result);
        alert('Face profile registered successfully for ' + faceModalStudent.full_name);
        setShowFaceModal(false);
        loadStudents(selectedClassId);
      } catch (err) {
        alert('Failed to register face: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentClass = classes.find(c => c.id === selectedClassId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Student & Classroom Management</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Configure classes, manage student rosters, and register biometric facial profiles
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowClassModal(true)} className="btn-secondary">
            <GraduationCap size={16} />
            <span>New Class</span>
          </button>
          <button
            onClick={() => setShowStudentModal(true)}
            className="btn-primary"
            disabled={!selectedClassId}
          >
            <Plus size={16} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Class Selector Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4
      }}>
        {classes.map(c => {
          const isSelected = selectedClassId === c.id;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                borderRadius: 8,
                background: isSelected ? 'rgba(79, 70, 229, 0.25)' : 'var(--bg-card)',
                border: `1px solid ${isSelected ? 'var(--primary-light)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isSelected ? '#fff' : 'var(--text-main)' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: isSelected ? '#a5b4fc' : 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {c.code} · {c.student_count || 0} students
                </div>
              </div>
              {isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClass(c.id);
                  }}
                  title="Delete Class"
                  style={{ color: '#f87171', padding: 2 }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Student Roster Section */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              {currentClass ? `${currentClass.name} Roster` : 'Class Roster'}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {filteredStudents.length} active students enrolled
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: 260 }}>
              <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: 10, top: 11 }} />
              <input
                type="text"
                placeholder="Search by name or ID..."
                className="form-input"
                style={{ paddingLeft: 32, fontSize: '0.82rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
            No students found in this class. Click "Add Student" above to enroll.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll / Student ID</th>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Face Profile</th>
                  <th>Privacy Consent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>
                        {s.student_id}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{s.full_name}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {s.email || '—'}
                    </td>
                    <td>
                      {s.has_face_profile ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>
                          <CheckCircle size={14} /> Registered
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setFaceModalStudent(s);
                            setShowFaceModal(true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.3)' }}
                        >
                          <Camera size={12} />
                          <span>Register Profile</span>
                        </button>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: s.consent_given ? '#34d399' : '#f87171', fontSize: '0.75rem' }}>
                        <ShieldCheck size={14} /> {s.consent_given ? 'Granted' : 'Revoked'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => {
                            setFaceModalStudent(s);
                            setShowFaceModal(true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '4px 8px' }}
                          title="Update Face Profile"
                        >
                          <Camera size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.id)}
                          className="btn-danger"
                          style={{ padding: '4px 8px' }}
                          title="Delete Student"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Class Modal */}
      {showClassModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, padding: 24, background: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Create New Class</h3>
              <button onClick={() => setShowClassModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Class Name</label>
                <input
                  required
                  className="form-input"
                  placeholder="e.g. Distributed Systems 2026"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Course Code</label>
                <input
                  required
                  className="form-input"
                  placeholder="e.g. CS-602"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Subject Area</label>
                <input
                  className="form-input"
                  placeholder="e.g. Computer Science"
                  value={classSubject}
                  onChange={(e) => setClassSubject(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowClassModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Student Modal */}
      {showStudentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, padding: 24, background: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Enroll New Student</h3>
              <button onClick={() => setShowStudentModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Student ID / Roll No.</label>
                <input
                  required
                  className="form-input"
                  placeholder="e.g. STU-201"
                  value={stuId}
                  onChange={(e) => setStuId(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Full Name</label>
                <input
                  required
                  className="form-input"
                  placeholder="e.g. Alex Morgan"
                  value={stuName}
                  onChange={(e) => setStuName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Institutional Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="alex.morgan@university.edu"
                  value={stuEmail}
                  onChange={(e) => setStuEmail(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowStudentModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Enroll Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Face Profile Modal */}
      {showFaceModal && faceModalStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, padding: 24, background: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Register Face Signature</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {faceModalStudent.full_name} ({faceModalStudent.student_id})
                </p>
              </div>
              <button onClick={() => setShowFaceModal(false)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Upload a clear frontal photo of the student to generate a local facial feature signature for attendance matching.
              </p>

              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '28px 16px',
                border: '2px dashed var(--border-color)',
                borderRadius: 8,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <Upload size={32} color="var(--primary-light)" style={{ marginBottom: 8 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Choose Photo File (JPG, PNG)</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>Processed strictly locally</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFaceUpload}
                  style={{ display: 'none' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setShowFaceModal(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

