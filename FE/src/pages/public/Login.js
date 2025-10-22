// src/pages/public/Login.js
import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, user } = useAuth();
    const navigate = useNavigate();

    const roleToPath = {
        'Admin': '/admin/permissions',
        'Manager': '/manager/products',
        'CEO': '/ceo/dashboard',
        'Cashier': '/cashier/pos',
        'Warehouse': '/warehouse/inventory',
        'Supplier': '/supplier/portal',
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        const response = await login(username, password);
        if (response.success) {
            navigate(roleToPath[response.user.role] || '/');
        } else {
            setError(response.message);
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <Card style={{ width: '400px' }}>
                <Card.Body>
                    <h2 className="text-center mb-4">CCMS Login</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleLogin}>
                        <Form.Group className="mb-3">
                            <Form.Label>Username</Form.Label>
                            <Form.Control type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (e.g., admin, manager, cashier)" required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (e.g., 123)" required />
                        </Form.Group>
                        <Button variant="primary" type="submit" className="w-100">Login</Button>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};
export default Login;