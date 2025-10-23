// src/pages/Manager/ScheduleManagement.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Spinner, Card } from 'react-bootstrap';
import { getSchedules } from '../../api/mockApi';
import { FaCalendarPlus } from 'react-icons/fa';

const ScheduleManagement = () => {
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSchedules().then(data => {
            setSchedule(data);
            setLoading(false);
        });
    }, []);

    if (loading) return <Spinner animation="border" />;

    const daysOfWeek = Object.keys(schedule);

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Lịch làm việc Tuần này</h2>
                <Button variant="success">
                    <FaCalendarPlus className="me-2" />
                    Sắp xếp lịch mới
                </Button>
            </div>
            <Card>
                <Table bordered hover responsive className="text-center mb-0">
                    <thead className="table-primary">
                        <tr>
                            <th>Ca làm việc</th>
                            {daysOfWeek.map(day => <th key={day}>{day}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Ca Sáng (6h-14h)</strong></td>
                            {daysOfWeek.map(day => <td key={day}>{schedule[day]['Ca Sáng (6h-14h)']}</td>)}
                        </tr>
                        <tr>
                            <td><strong>Ca Tối (14h-22h)</strong></td>
                            {daysOfWeek.map(day => <td key={day}>{schedule[day]['Ca Tối (14h-22h)']}</td>)}
                        </tr>
                    </tbody>
                </Table>
            </Card>
        </div>
    );
};

export default ScheduleManagement;