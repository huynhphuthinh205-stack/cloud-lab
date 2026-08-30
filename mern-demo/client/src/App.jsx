import { useEffect, useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
    const [students, setStudents] = useState([]);
    const [studentId, setStudentId] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    const loadStudents = async () => {
        const response = await fetch(
            "/api/students"
        );

        const data = await response.json();
        setStudents(data);
    };

    useEffect(() => {
        loadStudents();
    }, []);

    const addStudent = async (e) => {
        e.preventDefault();

        await fetch("/api/students", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                studentId,
                name,
                email
            })
        });

        setStudentId("");
        setName("");
        setEmail("");

        loadStudents();
    };

    return (
        <div style={{ padding: "30px" }}>
            <h1>Quản lý sinh viên</h1>

            <form onSubmit={addStudent}>
                <input
                    placeholder="MSSV"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                />

                <input
                    placeholder="Họ tên"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <input
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <button type="submit">
                    Thêm sinh viên
                </button>
            </form>

            <hr />

            <h2>Danh sách sinh viên</h2>

            <ul>
                {students.map((student) => (
                    <li key={student._id}>
                        {student.studentId} - {student.name} - {student.email}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default App;