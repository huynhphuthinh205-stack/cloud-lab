import { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';

// Lấy URL Backend từ biến môi trường VITE_API_URL, có fallback thông minh
const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
        return envUrl.trim().replace(/\/+$/, '');
    }
    // Khi chạy local dev không cấu hình biến môi trường
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:5000';
    }
    // Mặc định kết nối backend trên Render
    return 'https://mern-backend-234665.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

function App() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [notification, setNotification] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        studentId: '',
        name: '',
        email: ''
    });
    const [searchTerm, setSearchTerm] = useState('');

    const formRef = useRef(null);
    const timeoutRef = useRef(null);

    // Hiển thị thông báo (thành công / lỗi / thông tin)
    const showNotification = useCallback((type, message) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setNotification({ type, message });
        timeoutRef.current = setTimeout(() => {
            setNotification(null);
        }, 5000);
    }, []);

    // Tải danh sách sinh viên từ Backend
    const loadStudents = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/students`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                let errorMsg = `Lỗi máy chủ (${response.status})`;
                try {
                    const errData = await response.json();
                    if (errData && errData.message) errorMsg = errData.message;
                } catch {
                    // Phản hồi không phải JSON
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            if (Array.isArray(data)) {
                setStudents(data);
            } else {
                setStudents([]);
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách sinh viên:', error);
            showNotification(
                'error',
                `Không thể tải danh sách sinh viên (${error.message}). Nếu backend đang khởi động từ chế độ ngủ trên Render, vui lòng chờ khoảng 30 giây rồi bấm "Làm mới".`
            );
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        let isMounted = true;
        const fetchInitial = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/students`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (isMounted) {
                    setStudents(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                if (isMounted) {
                    console.error('Lỗi khi tải danh sách sinh viên ban đầu:', error);
                    showNotification(
                        'error',
                        `Không thể tải danh sách sinh viên (${error.message}). Nếu backend đang khởi động từ chế độ ngủ trên Render, vui lòng chờ khoảng 30 giây rồi bấm "Làm mới".`
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchInitial();

        return () => {
            isMounted = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [showNotification]);

    // Xử lý thay đổi input trong Form
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    // Bắt đầu chỉnh sửa sinh viên
    const handleStartEdit = (student) => {
        setEditingId(student._id);
        setFormData({
            studentId: student.studentId || '',
            name: student.name || '',
            email: student.email || ''
        });
        showNotification('info', `Đang chỉnh sửa sinh viên: ${student.name} (${student.studentId})`);
        if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Hủy bỏ chế độ chỉnh sửa
    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ studentId: '', name: '', email: '' });
    };

    // Gửi Form (Thêm mới hoặc Cập nhật)
    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedId = formData.studentId.trim();
        const trimmedName = formData.name.trim();
        const trimmedEmail = formData.email.trim();

        if (!trimmedId || !trimmedName || !trimmedEmail) {
            showNotification('error', 'Vui lòng điền đầy đủ Mã số sinh viên, Họ tên và Email!');
            return;
        }

        setSubmitting(true);
        try {
            if (editingId) {
                // Cập nhật sinh viên (PUT)
                const response = await fetch(`${API_BASE_URL}/api/students/${editingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        studentId: trimmedId,
                        name: trimmedName,
                        email: trimmedEmail
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Cập nhật sinh viên thất bại!');
                }

                showNotification('success', `Cập nhật sinh viên "${data.name}" thành công!`);
                handleCancelEdit();
                await loadStudents();
            } else {
                // Thêm mới sinh viên (POST)
                const response = await fetch(`${API_BASE_URL}/api/students`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        studentId: trimmedId,
                        name: trimmedName,
                        email: trimmedEmail
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Thêm sinh viên thất bại!');
                }

                showNotification('success', `Thêm sinh viên "${data.name}" (MSSV: ${data.studentId}) thành công!`);
                setFormData({ studentId: '', name: '', email: '' });
                await loadStudents();
            }
        } catch (error) {
            console.error('Lỗi khi lưu dữ liệu:', error);
            showNotification('error', error.message || 'Có lỗi xảy ra khi lưu dữ liệu');
        } finally {
            setSubmitting(false);
        }
    };

    // Xóa sinh viên (DELETE) có xác nhận trước khi xóa
    const handleDelete = async (student) => {
        const confirmMsg = `Bạn có chắc chắn muốn xóa sinh viên sau không?\n\n- MSSV: ${student.studentId}\n- Họ tên: ${student.name}\n- Email: ${student.email}\n\nHành động này không thể hoàn tác!`;
        const confirmed = window.confirm(confirmMsg);

        if (!confirmed) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/students/${student._id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Xóa sinh viên thất bại!');
            }

            showNotification('success', `Đã xóa sinh viên "${student.name}" (MSSV: ${student.studentId}) thành công!`);

            if (editingId === student._id) {
                handleCancelEdit();
            }

            await loadStudents();
        } catch (error) {
            console.error('Lỗi khi xóa sinh viên:', error);
            showNotification('error', error.message || 'Không thể xóa sinh viên');
        }
    };

    // Lọc danh sách sinh viên theo từ khóa tìm kiếm
    const filteredStudents = students.filter((s) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            (s.studentId && s.studentId.toLowerCase().includes(term)) ||
            (s.name && s.name.toLowerCase().includes(term)) ||
            (s.email && s.email.toLowerCase().includes(term))
        );
    });

    return (
        <div className="app-container">
            {/* Header */}
            <header className="app-header">
                <div className="header-content">
                    <h1>🎓 Quản Lý Sinh Viên</h1>
                    <p className="header-subtitle">Hệ thống CRUD Quản lý sinh viên - Kiến trúc MERN Stack</p>
                </div>
                <div className="status-badges">
                    <span className="badge badge-api" title={`API URL: ${API_BASE_URL}`}>
                        🌐 Backend: <strong>{API_BASE_URL}</strong>
                    </span>
                    <span className="badge badge-count">
                        👥 Tổng số: <strong>{students.length}</strong> sinh viên
                    </span>
                    <button
                        className="btn-refresh"
                        onClick={loadStudents}
                        disabled={loading}
                        title="Tải lại danh sách từ máy chủ"
                    >
                        🔄 {loading ? 'Đang tải...' : 'Làm mới'}
                    </button>
                </div>
            </header>

            {/* Thông báo thông tin / thành công / lỗi */}
            {notification && (
                <div className={`notification notification-${notification.type}`} role="alert">
                    <span className="notification-icon">
                        {notification.type === 'success' && '✅'}
                        {notification.type === 'error' && '❌'}
                        {notification.type === 'info' && 'ℹ️'}
                    </span>
                    <span className="notification-message">{notification.message}</span>
                    <button
                        className="notification-close"
                        onClick={() => setNotification(null)}
                        aria-label="Đóng thông báo"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Khung Form Thêm / Sửa Sinh Viên */}
            <section className="card form-card" ref={formRef}>
                <div className="card-header">
                    <h2>
                        {editingId ? '✏️ Cập Nhật Thông Tin Sinh Viên' : '➕ Thêm Sinh Viên Mới'}
                    </h2>
                    {editingId && (
                        <span className="editing-badge">Đang ở chế độ sửa</span>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="student-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="studentId">
                                Mã số sinh viên (MSSV) <span className="required">*</span>
                            </label>
                            <input
                                id="studentId"
                                name="studentId"
                                type="text"
                                placeholder="Ví dụ: SV001"
                                value={formData.studentId}
                                onChange={handleInputChange}
                                disabled={submitting}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="name">
                                Họ và tên <span className="required">*</span>
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="Ví dụ: Nguyễn Văn A"
                                value={formData.name}
                                onChange={handleInputChange}
                                disabled={submitting}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                Địa chỉ Email <span className="required">*</span>
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="Ví dụ: vana@example.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                disabled={submitting}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className={`btn ${editingId ? 'btn-warning' : 'btn-primary'}`}
                            disabled={submitting}
                        >
                            {submitting
                                ? '⏳ Đang xử lý...'
                                : editingId
                                ? '💾 Lưu thay đổi'
                                : '➕ Thêm sinh viên'}
                        </button>

                        {editingId && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleCancelEdit}
                                disabled={submitting}
                            >
                                ✕ Hủy sửa
                            </button>
                        )}
                    </div>
                </form>
            </section>

            {/* Bảng Danh Sách Sinh Viên */}
            <section className="card list-card">
                <div className="list-card-header">
                    <h2>📋 Danh Sách Sinh Viên ({filteredStudents.length})</h2>
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="🔍 Tìm kiếm theo MSSV, tên, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                className="clear-search"
                                onClick={() => setSearchTerm('')}
                                title="Xóa tìm kiếm"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Đang tải dữ liệu từ máy chủ...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="empty-state">
                        <p>
                            {searchTerm
                                ? 'Không tìm thấy sinh viên nào phù hợp với từ khóa.'
                                : 'Hiện chưa có sinh viên nào trong danh sách. Hãy thêm sinh viên đầu tiên ở biểu mẫu phía trên!'}
                        </p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="student-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>STT</th>
                                    <th>MSSV</th>
                                    <th>Họ và tên</th>
                                    <th>Email</th>
                                    <th style={{ width: '180px', textAlign: 'center' }}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student, index) => (
                                    <tr
                                        key={student._id}
                                        className={editingId === student._id ? 'row-editing' : ''}
                                    >
                                        <td className="text-center">{index + 1}</td>
                                        <td>
                                            <span className="badge-mssv">{student.studentId}</span>
                                        </td>
                                        <td className="font-semibold">{student.name}</td>
                                        <td>
                                            <a href={`mailto:${student.email}`} className="email-link">
                                                {student.email}
                                            </a>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn btn-sm btn-edit"
                                                    onClick={() => handleStartEdit(student)}
                                                    title="Chỉnh sửa thông tin sinh viên"
                                                >
                                                    ✏️ Sửa
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-delete"
                                                    onClick={() => handleDelete(student)}
                                                    title="Xóa sinh viên khỏi hệ thống"
                                                >
                                                    🗑️ Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default App;