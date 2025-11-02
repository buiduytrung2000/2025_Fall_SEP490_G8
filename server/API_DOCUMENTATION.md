# Schedule Management API Documentation

## Base URL
```
/api/v1/schedule
```

**All endpoints require authentication via JWT token in the Authorization header:**
```
Authorization: Bearer <token>
```

---

## Shift Template Endpoints

### 1. Get All Shift Templates
```http
GET /api/v1/schedule/shift-templates
```

**Response:**
```json
{
  "err": 0,
  "msg": "OK",
  "data": [
    {
      "shift_template_id": 1,
      "name": "Ca Sáng",
      "start_time": "06:00:00",
      "end_time": "14:00:00",
      "description": "Ca làm việc buổi sáng",
      "is_active": true,
      "created_at": "2024-12-01T00:00:00.000Z",
      "updated_at": "2024-12-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Get Shift Template by ID
```http
GET /api/v1/schedule/shift-templates/:id
```

### 3. Create Shift Template
```http
POST /api/v1/schedule/shift-templates
Content-Type: application/json

{
  "name": "Ca Sáng",
  "start_time": "06:00:00",
  "end_time": "14:00:00",
  "description": "Ca làm việc buổi sáng từ 6h đến 14h",
  "is_active": true
}
```

### 4. Update Shift Template
```http
PUT /api/v1/schedule/shift-templates/:id
Content-Type: application/json

{
  "name": "Ca Sáng (Updated)",
  "is_active": false
}
```

---

## Schedule Endpoints

### 1. Get Schedules
```http
GET /api/v1/schedule/schedules?store_id=1&start_date=2024-12-16&end_date=2024-12-22
```

**Query Parameters:**
- `store_id` (required): Store ID
- `start_date` (required): Start date (YYYY-MM-DD)
- `end_date` (required): End date (YYYY-MM-DD)

**Response:**
```json
{
  "err": 0,
  "msg": "OK",
  "data": [
    {
      "schedule_id": 1,
      "store_id": 1,
      "user_id": 3,
      "shift_template_id": 1,
      "work_date": "2024-12-16",
      "status": "confirmed",
      "notes": "Ca sáng thứ hai",
      "employee": {
        "user_id": 3,
        "username": "cashier_store1_1",
        "email": "cashier1@ccms.com",
        "role": "Cashier"
      },
      "shiftTemplate": {
        "shift_template_id": 1,
        "name": "Ca Sáng",
        "start_time": "06:00:00",
        "end_time": "14:00:00"
      }
    }
  ]
}
```

### 2. Get Schedule by ID
```http
GET /api/v1/schedule/schedules/:id
```

### 3. Get Employee Schedules
```http
GET /api/v1/schedule/schedules/employee/:user_id?start_date=2024-12-16&end_date=2024-12-22
```

### 4. Get My Schedules (Current User)
```http
GET /api/v1/schedule/schedules/my-schedules?start_date=2024-12-16&end_date=2024-12-22
```

**Query Parameters (optional):**
- `start_date`: Start date (YYYY-MM-DD), defaults to today
- `end_date`: End date (YYYY-MM-DD), defaults to 14 days from today

### 5. Create Schedule
```http
POST /api/v1/schedule/schedules
Content-Type: application/json

{
  "store_id": 1,
  "user_id": 3,
  "shift_template_id": 1,
  "work_date": "2024-12-16",
  "status": "confirmed",
  "notes": "Ca sáng thứ hai"
}
```

**Note:** Automatically checks for schedule conflicts before creating.

**Response (if conflict):**
```json
{
  "err": 1,
  "msg": "Schedule conflicts detected",
  "data": {
    "has_conflicts": true,
    "conflicts": [
      {
        "schedule_id": 5,
        "work_date": "2024-12-16",
        "shift_name": "Ca Tối",
        "conflict_reason": "Overlapping time slots"
      }
    ]
  }
}
```

### 6. Update Schedule
```http
PUT /api/v1/schedule/schedules/:id
Content-Type: application/json

{
  "user_id": 4,
  "status": "confirmed",
  "notes": "Updated notes"
}
```

### 7. Delete Schedule
```http
DELETE /api/v1/schedule/schedules/:id
```

### 8. Get Available Shifts (Unassigned)
```http
GET /api/v1/schedule/schedules/available?store_id=1&start_date=2024-12-16&end_date=2024-12-22
```

**Response:**
```json
{
  "err": 0,
  "msg": "OK",
  "data": [
    {
      "work_date": "2024-12-16",
      "shift_template_id": 2,
      "shift_name": "Ca Tối",
      "start_time": "14:00:00",
      "end_time": "22:00:00"
    }
  ]
}
```

### 9. Get Schedule Statistics
```http
GET /api/v1/schedule/schedules/statistics?store_id=1&role=Cashier
```

**Query Parameters:**
- `store_id` (required): Store ID
- `role` (optional): Filter by role (CEO, Store_Manager, Cashier, Warehouse, Supplier)

**Response:**
```json
{
  "err": 0,
  "msg": "OK",
  "data": [
    {
      "user_id": 3,
      "username": "cashier_store1_1",
      "total_work_days": 7,
      "total_shifts": 14,
      "total_hours": 112,
      "confirmed_shifts": 13,
      "draft_shifts": 1
    }
  ]
}
```

### 10. Check Schedule Conflicts
```http
POST /api/v1/schedule/schedules/check-conflicts
Content-Type: application/json

{
  "user_id": 3,
  "work_date": "2024-12-16",
  "shift_template_id": 1
}
```

**Response:**
```json
{
  "err": 0,
  "msg": "Conflicts found",
  "data": {
    "has_conflicts": true,
    "conflicts": [
      {
        "schedule_id": 5,
        "work_date": "2024-12-16",
        "shift_name": "Ca Tối",
        "conflict_reason": "Overlapping time slots"
      }
    ]
  }
}
```

---

## Shift Change Request Endpoints

### 1. Create Shift Change Request
```http
POST /api/v1/schedule/shift-change-requests
Content-Type: application/json

{
  "store_id": 1,
  "from_schedule_id": 5,
  "from_user_id": 4,
  "to_user_id": 3,
  "to_schedule_id": 6,
  "request_type": "swap",
  "reason": "Có việc đột xuất"
}
```

**Request Types:**
- `swap`: Đổi ca với người khác (cần `to_schedule_id` và `to_user_id`)
- `give_away`: Nhường ca (cần `to_user_id`)
- `take_over`: Nhận ca từ người khác (cần `to_user_id`)

### 2. Get Shift Change Requests
```http
GET /api/v1/schedule/shift-change-requests?store_id=1&status=pending&from_user_id=4
```

**Query Parameters (all optional):**
- `store_id`: Filter by store
- `from_user_id`: Filter by requester
- `status`: Filter by status (pending, approved, rejected, cancelled)

### 3. Get My Shift Change Requests
```http
GET /api/v1/schedule/shift-change-requests/my-requests?status=pending
```

**Query Parameters (optional):**
- `status`: Filter by status

### 4. Get Shift Change Request by ID
```http
GET /api/v1/schedule/shift-change-requests/:id
```

### 5. Review Shift Change Request (Approve/Reject)
```http
PUT /api/v1/schedule/shift-change-requests/:id/review
Content-Type: application/json

{
  "status": "approved",
  "review_notes": "Approved by manager"
}
```

**Status Values:**
- `approved`: Duyệt yêu cầu (sẽ tự động swap users trong schedules)
- `rejected`: Từ chối yêu cầu

**Note:** When approved, the system automatically swaps or transfers users in the schedules based on `request_type`.

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "err": 1,
  "msg": "Missing required parameters: store_id, start_date, end_date"
}
```

### 401 Unauthorized
```json
{
  "err": 1,
  "msg": "Missing access token"
}
```

### 404 Not Found
```json
{
  "err": 1,
  "msg": "Schedule not found"
}
```

### 500 Internal Server Error
```json
{
  "err": -1,
  "msg": "Failed at schedule controller: <error message>"
}
```

---

## Notes

1. **Date Format:** All dates should be in `YYYY-MM-DD` format (ISO date format)

2. **Time Format:** All times should be in `HH:MM:SS` format (24-hour format)

3. **Schedule Status:**
   - `draft`: Nháp (chưa xác nhận)
   - `confirmed`: Đã xác nhận
   - `cancelled`: Đã hủy

4. **Conflict Detection:** The system automatically checks for overlapping shifts when creating or updating schedules

5. **Auto-swap:** When a shift change request is approved, the system automatically updates the schedules to swap or transfer users

6. **Permissions:** Different roles may have different access levels (should be implemented in middleware if needed)

