// src/pages/public/Unauthorized.js
import React from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Unauthorized = () => (
    <Container className="text-center mt-5">
        <Alert variant="danger">
            <Alert.Heading>Access Denied</Alert.Heading>
            <p>You do not have permission to view this page.</p>
            <hr />
            <Link to="/">Go to Homepage</Link>
        </Alert>
    </Container>
);

export default Unauthorized;