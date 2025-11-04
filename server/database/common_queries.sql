-- =====================================================
-- CCMS Database - Common Queries
-- =====================================================
-- Useful queries for common operations
-- =====================================================

USE CCMS_DB;

-- =====================================================
-- INVENTORY QUERIES
-- =====================================================

-- 1. Get low stock products for a specific store
SELECT 
    p.name AS product_name,
    p.sku,
    i.stock,
    i.min_stock_level,
    i.reorder_point,
    (i.reorder_point - i.stock) AS need_to_order
FROM Inventory i
JOIN Product p ON i.product_id = p.product_id
WHERE i.store_id = 1 
    AND i.stock <= i.reorder_point
ORDER BY i.stock ASC;

-- 2. Get all products with inventory across all stores
SELECT 
    s.name AS store_name,
    p.name AS product_name,
    p.sku,
    i.stock,
    i.min_stock_level,
    i.reorder_point,
    CASE 
        WHEN i.stock <= i.min_stock_level THEN 'Critical'
        WHEN i.stock <= i.reorder_point THEN 'Low'
        ELSE 'OK'
    END AS stock_status
FROM Inventory i
JOIN Product p ON i.product_id = p.product_id
JOIN Store s ON i.store_id = s.store_id
ORDER BY s.name, p.name;

-- 3. Get total inventory value per store
SELECT 
    s.name AS store_name,
    SUM(i.stock * pr.value) AS total_inventory_value
FROM Inventory i
JOIN Store s ON i.store_id = s.store_id
JOIN Product p ON i.product_id = p.product_id
LEFT JOIN PricingRule pr ON p.product_id = pr.product_id 
    AND s.store_id = pr.store_id
    AND CURDATE() BETWEEN DATE(pr.start_date) AND DATE(pr.end_date)
GROUP BY s.store_id, s.name
ORDER BY total_inventory_value DESC;

-- =====================================================
-- ORDER QUERIES
-- =====================================================

-- 4. Get pending orders with details
SELECT 
    o.order_id,
    s.name AS store_name,
    sup.name AS supplier_name,
    u.username AS created_by,
    o.status,
    o.created_at,
    o.expected_delivery,
    SUM(oi.subtotal) AS order_total
FROM `Order` o
JOIN Store s ON o.store_id = s.store_id
JOIN Supplier sup ON o.supplier_id = sup.supplier_id
JOIN User u ON o.created_by = u.user_id
LEFT JOIN OrderItem oi ON o.order_id = oi.order_id
WHERE o.status = 'pending'
GROUP BY o.order_id, s.name, sup.name, u.username, o.status, o.created_at, o.expected_delivery
ORDER BY o.created_at ASC;

-- 5. Get order details with items
SELECT 
    o.order_id,
    s.name AS store_name,
    sup.name AS supplier_name,
    p.name AS product_name,
    p.sku,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    o.status,
    o.created_at
FROM `Order` o
JOIN Store s ON o.store_id = s.store_id
JOIN Supplier sup ON o.supplier_id = sup.supplier_id
JOIN OrderItem oi ON o.order_id = oi.order_id
JOIN Product p ON oi.product_id = p.product_id
WHERE o.order_id = 1;

-- =====================================================
-- PRICING QUERIES
-- =====================================================

-- 6. Get current pricing for products in a store
SELECT 
    p.name AS product_name,
    p.sku,
    p.hq_price AS base_price,
    pr.type AS pricing_type,
    pr.value AS pricing_value,
    CASE 
        WHEN pr.type = 'markup' THEN p.hq_price + pr.value
        WHEN pr.type = 'markdown' THEN p.hq_price - pr.value
        WHEN pr.type = 'fixed_price' THEN pr.value
        ELSE p.hq_price
    END AS current_price
FROM Product p
LEFT JOIN PricingRule pr ON p.product_id = pr.product_id
    AND pr.store_id = 1
    AND CURDATE() BETWEEN DATE(pr.start_date) AND DATE(pr.end_date)
WHERE p.product_id IN (
    SELECT product_id FROM Inventory WHERE store_id = 1
)
ORDER BY p.name;

-- 7. Get products with active promotions
SELECT 
    p.name AS product_name,
    p.sku,
    prom.name AS promotion_name,
    prom.type AS promotion_type,
    prom.start_date,
    prom.end_date
FROM Product p
JOIN ProductPromotion pp ON p.product_id = pp.product_id
JOIN Promotion prom ON pp.promotion_id = prom.promotion_id
WHERE prom.status = 'active'
    AND CURDATE() BETWEEN DATE(prom.start_date) AND DATE(prom.end_date)
ORDER BY p.name;

-- =====================================================
-- TRANSACTION/SALES QUERIES
-- =====================================================

-- 8. Get daily sales report
SELECT 
    DATE(t.created_at) AS sale_date,
    s.name AS store_name,
    COUNT(DISTINCT t.transaction_id) AS total_transactions,
    COUNT(ti.transaction_item_id) AS total_items_sold,
    SUM(t.total_amount) AS total_revenue
FROM Transaction t
JOIN Store s ON t.store_id = s.store_id
LEFT JOIN TransactionItem ti ON t.transaction_id = ti.transaction_id
WHERE t.status = 'completed'
    AND DATE(t.created_at) = CURDATE()
GROUP BY DATE(t.created_at), s.store_id, s.name;

-- 9. Get sales by product
SELECT 
    p.name AS product_name,
    p.sku,
    SUM(ti.quantity) AS total_sold,
    SUM(ti.subtotal) AS total_revenue,
    AVG(ti.unit_price) AS avg_price
FROM TransactionItem ti
JOIN Product p ON ti.product_id = p.product_id
JOIN Transaction t ON ti.transaction_id = t.transaction_id
WHERE t.status = 'completed'
    AND t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY p.product_id, p.name, p.sku
ORDER BY total_revenue DESC;

-- 10. Get customer purchase history
SELECT 
    c.name AS customer_name,
    c.tier AS loyalty_tier,
    t.transaction_id,
    t.total_amount,
    t.created_at AS purchase_date,
    pay.method AS payment_method,
    s.name AS store_name
FROM Transaction t
JOIN Customer c ON t.customer_id = c.customer_id
JOIN Payment pay ON t.payment_id = pay.payment_id
JOIN Store s ON t.store_id = s.store_id
WHERE c.customer_id = 1
ORDER BY t.created_at DESC;

-- =====================================================
-- CUSTOMER QUERIES
-- =====================================================

-- 11. Get top customers by spending
SELECT 
    c.name AS customer_name,
    c.email,
    c.tier AS loyalty_tier,
    COUNT(t.transaction_id) AS total_purchases,
    SUM(t.total_amount) AS total_spent,
    AVG(t.total_amount) AS avg_order_value
FROM Customer c
LEFT JOIN Transaction t ON c.customer_id = t.customer_id
WHERE t.status = 'completed'
GROUP BY c.customer_id, c.name, c.email, c.tier
ORDER BY total_spent DESC
LIMIT 10;

-- 12. Get customers eligible for tier upgrade
SELECT 
    c.name AS customer_name,
    c.tier AS current_tier,
    c.loyalty_point,
    CASE 
        WHEN c.loyalty_point >= 1000 THEN 'platinum'
        WHEN c.loyalty_point >= 500 THEN 'gold'
        WHEN c.loyalty_point >= 200 THEN 'silver'
        ELSE 'bronze'
    END AS should_be_tier
FROM Customer c
WHERE CASE 
    WHEN c.loyalty_point >= 1000 THEN 'platinum'
    WHEN c.loyalty_point >= 500 THEN 'gold'
    WHEN c.loyalty_point >= 200 THEN 'silver'
    ELSE 'bronze'
END != c.tier;

-- =====================================================
-- USER/STAFF QUERIES
-- =====================================================

-- 13. Get staff by store
SELECT 
    u.user_id,
    u.username,
    u.email,
    u.role,
    s.name AS store_name,
    u.status
FROM User u
LEFT JOIN Store s ON u.store_id = s.store_id
WHERE u.role != 'CEO'
ORDER BY s.name, u.role;

-- 14. Get orders created by a specific user
SELECT 
    o.order_id,
    s.name AS store_name,
    sup.name AS supplier_name,
    o.status,
    o.created_at,
    SUM(oi.subtotal) AS order_total
FROM `Order` o
JOIN Store s ON o.store_id = s.store_id
JOIN Supplier sup ON o.supplier_id = sup.supplier_id
LEFT JOIN OrderItem oi ON o.order_id = oi.order_id
WHERE o.created_by = 2
GROUP BY o.order_id, s.name, sup.name, o.status, o.created_at
ORDER BY o.created_at DESC;

-- =====================================================
-- CATEGORY QUERIES
-- =====================================================

-- 15. Get category tree (hierarchical)
WITH RECURSIVE category_tree AS (
    -- Base case: root categories
    SELECT 
        category_id,
        name,
        parent_id,
        CAST(name AS CHAR(1000)) AS path,
        0 AS level
    FROM Category
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child categories
    SELECT 
        c.category_id,
        c.name,
        c.parent_id,
        CONCAT(ct.path, ' > ', c.name) AS path,
        ct.level + 1 AS level
    FROM Category c
    INNER JOIN category_tree ct ON c.parent_id = ct.category_id
)
SELECT 
    category_id,
    name,
    parent_id,
    path,
    level
FROM category_tree
ORDER BY path;

-- 16. Get products by category
SELECT 
    cat.name AS category_name,
    COUNT(p.product_id) AS product_count,
    GROUP_CONCAT(p.name SEPARATOR ', ') AS products
FROM Category cat
LEFT JOIN Product p ON cat.category_id = p.category_id
GROUP BY cat.category_id, cat.name
ORDER BY cat.name;

-- =====================================================
-- SUPPLIER QUERIES
-- =====================================================

-- 17. Get supplier order statistics
SELECT 
    sup.name AS supplier_name,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(oi.quantity) AS total_items_ordered,
    SUM(oi.subtotal) AS total_order_value,
    AVG(oi.subtotal) AS avg_order_value
FROM Supplier sup
LEFT JOIN `Order` o ON sup.supplier_id = o.supplier_id
LEFT JOIN OrderItem oi ON o.order_id = oi.order_id
GROUP BY sup.supplier_id, sup.name
ORDER BY total_order_value DESC;

-- =====================================================
-- ANALYTICS QUERIES
-- =====================================================

-- 18. Get store performance summary
SELECT 
    s.name AS store_name,
    COUNT(DISTINCT t.transaction_id) AS total_transactions,
    SUM(t.total_amount) AS total_revenue,
    COUNT(DISTINCT t.customer_id) AS unique_customers,
    AVG(t.total_amount) AS avg_transaction_value,
    MAX(t.created_at) AS last_sale_date
FROM Store s
LEFT JOIN Transaction t ON s.store_id = t.store_id
WHERE t.status = 'completed'
    AND t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY s.store_id, s.name
ORDER BY total_revenue DESC;

-- 19. Get product performance report
SELECT 
    p.name AS product_name,
    p.sku,
    cat.name AS category,
    COUNT(DISTINCT ti.transaction_id) AS times_sold,
    SUM(ti.quantity) AS total_quantity_sold,
    SUM(ti.subtotal) AS total_revenue,
    AVG(ti.unit_price) AS avg_selling_price
FROM Product p
LEFT JOIN Category cat ON p.category_id = cat.category_id
LEFT JOIN TransactionItem ti ON p.product_id = ti.product_id
LEFT JOIN Transaction t ON ti.transaction_id = t.transaction_id
WHERE t.status = 'completed'
    AND t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY p.product_id, p.name, p.sku, cat.name
ORDER BY total_revenue DESC;

-- =====================================================
-- SCHEDULE MANAGEMENT QUERIES
-- =====================================================

-- 20. Get weekly schedule for a store
SELECT 
    s.work_date,
    st.name AS shift_name,
    st.start_time,
    st.end_time,
    u.username AS employee_name,
    u.email AS employee_email,
    s.status,
    s.notes,
    creator.username AS created_by_name
FROM Schedule s
JOIN ShiftTemplate st ON s.shift_template_id = st.shift_template_id
JOIN User u ON s.user_id = u.user_id
JOIN User creator ON s.created_by = creator.user_id
WHERE s.store_id = 1
    AND s.work_date >= DATE('2024-12-16')
    AND s.work_date <= DATE('2024-12-22')
ORDER BY s.work_date, st.start_time;

-- 21. Get schedule for a specific employee
SELECT 
    s.work_date,
    st.name AS shift_name,
    CONCAT(TIME_FORMAT(st.start_time, '%H:%i'), ' - ', TIME_FORMAT(st.end_time, '%H:%i')) AS shift_time,
    store.name AS store_name,
    s.status,
    s.notes
FROM Schedule s
JOIN ShiftTemplate st ON s.shift_template_id = st.shift_template_id
JOIN Store store ON s.store_id = store.store_id
WHERE s.user_id = 3
    AND s.work_date >= CURDATE()
    AND s.work_date <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)
ORDER BY s.work_date, st.start_time;

-- 22. Get schedule in calendar format (by week)
SELECT 
    DAYNAME(s.work_date) AS day_name,
    s.work_date,
    st.name AS shift_name,
    st.start_time,
    st.end_time,
    u.username AS employee_name,
    s.status
FROM Schedule s
JOIN ShiftTemplate st ON s.shift_template_id = st.shift_template_id
JOIN User u ON s.user_id = u.user_id
WHERE s.store_id = 1
    AND YEARWEEK(s.work_date) = YEARWEEK('2024-12-16')
ORDER BY s.work_date, st.start_time;

-- 23. Get pending shift change requests
SELECT 
    scr.request_id,
    s.name AS store_name,
    from_user.username AS from_employee,
    to_user.username AS to_employee,
    from_st.name AS from_shift,
    DATE(from_sched.work_date) AS from_date,
    to_st.name AS to_shift,
    DATE(to_sched.work_date) AS to_date,
    scr.request_type,
    scr.reason,
    scr.requested_at,
    reviewer.username AS reviewed_by_name,
    scr.reviewed_at
FROM ShiftChangeRequest scr
JOIN Store s ON scr.store_id = s.store_id
JOIN Schedule from_sched ON scr.from_schedule_id = from_sched.schedule_id
JOIN ShiftTemplate from_st ON from_sched.shift_template_id = from_st.shift_template_id
JOIN User from_user ON scr.from_user_id = from_user.user_id
LEFT JOIN Schedule to_sched ON scr.to_schedule_id = to_sched.schedule_id
LEFT JOIN ShiftTemplate to_st ON to_sched.shift_template_id = to_st.shift_template_id
LEFT JOIN User to_user ON scr.to_user_id = to_user.user_id
LEFT JOIN User reviewer ON scr.reviewed_by = reviewer.user_id
WHERE scr.status = 'pending'
ORDER BY scr.requested_at DESC;

-- 24. Get shift change requests for a specific employee
SELECT 
    scr.request_id,
    st.name AS shift_name,
    s.work_date,
    scr.request_type,
    scr.reason,
    scr.status,
    scr.requested_at,
    CASE 
        WHEN scr.status = 'pending' THEN 'Chờ duyệt'
        WHEN scr.status = 'approved' THEN 'Đã duyệt'
        WHEN scr.status = 'rejected' THEN 'Đã từ chối'
        ELSE 'Đã hủy'
    END AS status_vn,
    reviewer.username AS reviewed_by_name
FROM ShiftChangeRequest scr
JOIN Schedule s ON scr.from_schedule_id = s.schedule_id
JOIN ShiftTemplate st ON s.shift_template_id = st.shift_template_id
LEFT JOIN User reviewer ON scr.reviewed_by = reviewer.user_id
WHERE scr.from_user_id = 4
ORDER BY scr.requested_at DESC;

-- 25. Get available shifts (chưa phân công)
SELECT 
    dates.work_date,
    st.shift_template_id,
    st.name AS shift_name,
    st.start_time,
    st.end_time
FROM (
    SELECT DATE('2024-12-16') + INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY AS work_date
    FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
    CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
    CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1) AS c
    WHERE (DATE('2024-12-16') + INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY) BETWEEN '2024-12-16' AND '2024-12-22'
) AS dates
CROSS JOIN ShiftTemplate st
WHERE st.is_active = TRUE
    AND NOT EXISTS (
        SELECT 1 
        FROM Schedule s 
        WHERE s.store_id = 1
            AND s.shift_template_id = st.shift_template_id
            AND s.work_date = dates.work_date
    )
ORDER BY dates.work_date, st.start_time;

-- 26. Get employee schedule statistics
SELECT 
    u.user_id,
    u.username,
    COUNT(DISTINCT s.work_date) AS total_work_days,
    COUNT(DISTINCT s.schedule_id) AS total_shifts,
    SUM(TIMESTAMPDIFF(HOUR, st.start_time, 
        CASE 
            WHEN st.end_time < st.start_time THEN ADDTIME(st.end_time, '24:00:00')
            ELSE st.end_time
        END
    )) AS total_hours,
    SUM(CASE WHEN s.status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_shifts,
    SUM(CASE WHEN s.status = 'draft' THEN 1 ELSE 0 END) AS draft_shifts
FROM User u
LEFT JOIN Schedule s ON u.user_id = s.user_id
LEFT JOIN ShiftTemplate st ON s.shift_template_id = st.shift_template_id
WHERE u.store_id = 1
    AND u.role = 'Cashier'
    AND (s.work_date IS NULL OR s.work_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))
GROUP BY u.user_id, u.username
ORDER BY total_shifts DESC;

-- 27. Get schedule conflicts (same employee, overlapping shifts)
SELECT 
    s1.schedule_id AS schedule_1_id,
    s1.user_id,
    u.username AS employee_name,
    s1.work_date AS date_1,
    st1.name AS shift_1_name,
    st1.start_time AS shift_1_start,
    st1.end_time AS shift_1_end,
    s2.schedule_id AS schedule_2_id,
    s2.work_date AS date_2,
    st2.name AS shift_2_name,
    st2.start_time AS shift_2_start,
    st2.end_time AS shift_2_end
FROM Schedule s1
JOIN Schedule s2 ON s1.user_id = s2.user_id
JOIN ShiftTemplate st1 ON s1.shift_template_id = st1.shift_template_id
JOIN ShiftTemplate st2 ON s2.shift_template_id = st2.shift_template_id
JOIN User u ON s1.user_id = u.user_id
WHERE s1.schedule_id < s2.schedule_id
    AND (
        (s1.work_date = s2.work_date AND (
            (st1.start_time <= st2.end_time AND st1.end_time >= st2.start_time) OR
            (st1.start_time > st1.end_time AND (st1.start_time <= st2.end_time OR st1.end_time >= st2.start_time))
        )) OR
        (DATE_ADD(s1.work_date, INTERVAL 1 DAY) = s2.work_date AND st1.end_time < st1.start_time)
    )
    AND s1.status != 'cancelled'
    AND s2.status != 'cancelled';

-- 28. Get upcoming schedules for next 7 days
SELECT 
    s.work_date,
    st.name AS shift_name,
    CONCAT(TIME_FORMAT(st.start_time, '%H:%i'), ' - ', TIME_FORMAT(st.end_time, '%H:%i')) AS shift_time,
    u.username AS employee_name,
    s.status,
    CASE 
        WHEN s.work_date = CURDATE() THEN 'Hôm nay'
        WHEN s.work_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN 'Ngày mai'
        ELSE CONCAT(DATEDIFF(s.work_date, CURDATE()), ' ngày nữa')
    END AS time_until
FROM Schedule s
JOIN ShiftTemplate st ON s.shift_template_id = st.shift_template_id
JOIN User u ON s.user_id = u.user_id
WHERE s.store_id = 1
    AND s.work_date >= CURDATE()
    AND s.work_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    AND s.status = 'confirmed'
ORDER BY s.work_date, st.start_time;

