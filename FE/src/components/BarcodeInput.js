/**
 * BarcodeInput Component
 * Input field để quét barcode với debounce, throttle, và validation
 * Auto-focus, xử lý Enter/Esc, play beep
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Form, InputGroup, Button, Spinner } from 'react-bootstrap'
import { FaQrcode, FaTimes } from 'react-icons/fa'
import '../assets/BarcodeInput.css'
import {
    normalizeBarcode,
    validateBarcodeFormat,
    createSmartScanner,
    playBeep,
    createScanHistory
} from '../utils/barcodeScanner'
import { findProductByBarcode } from '../api/barcodeApi'
import { toast } from 'react-toastify'

const BarcodeInput = ({
    onProductScanned, // Callback khi quét thành công: (productData) => void
    onError, // Callback khi error: (errorMsg) => void
    storeId,
    config = {}, // { enableSound, debounceDelay, throttleInterval, validateFormat, clearInputAfterScan, autoFocus }
    placeholder = 'Quét mã vạch hoặc nhập SKU...',
    className = ''
}) => {
    const inputRef = useRef(null)
    const [barcode, setBarcode] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [lastScannedBarcode, setLastScannedBarcode] = useState(null)
    const scanHistoryRef = useRef(createScanHistory())
    const smartScannerRef = useRef(null)

    // Merge config with defaults
    const finalConfig = {
        enableSound: true,
        beepType: 'success',
        debounceDelay: 200,
        throttleInterval: 150,
        validateFormat: true,
        clearInputAfterScan: true,
        autoFocus: true,
        duplicateCheckWindowMs: 500,
        ...config
    }

    // Initialize smart scanner on mount
    useEffect(() => {
        if (!smartScannerRef.current) {
            smartScannerRef.current = createSmartScanner(
                handleBarcodeScanned,
                finalConfig.debounceDelay,
                finalConfig.throttleInterval
            )
        }
    }, [])

    // Auto-focus input on mount
    useEffect(() => {
        if (finalConfig.autoFocus && inputRef.current) {
            inputRef.current.focus()
        }
    }, [finalConfig.autoFocus])

    /**
     * Xử lý khi barcode được quét/nhập
     */
    const handleBarcodeScanned = useCallback(async (barcodeInput) => {
        // Validation
        const normalized = normalizeBarcode(barcodeInput)
        if (!normalized.valid) {
            if (onError) onError(normalized.error)
            playBeep('error', 150)
            toast.error(`❌ ${normalized.error}`)
            return
        }

        const trimmedBarcode = normalized.normalized

        // Check duplicate
        if (scanHistoryRef.current.isDuplicate(trimmedBarcode, finalConfig.duplicateCheckWindowMs)) {
            // Silent duplicate check - don't show toast, just ignore
            console.debug('Duplicate barcode detected, skipping:', trimmedBarcode)
            return
        }

        // Format validation (optional)
        if (finalConfig.validateFormat) {
            const formatCheck = validateBarcodeFormat(trimmedBarcode)
            if (!formatCheck.valid) {
                if (onError) onError(formatCheck.error)
                playBeep('warning', 150)
                toast.warning(`⚠️ ${formatCheck.error}. Sẽ tiếp tục tìm kiếm...`)
                // Vẫn tiếp tục tìm kiếm thay vì dừng
            }
        }

        // Track scan
        scanHistoryRef.current.push(trimmedBarcode)
        setLastScannedBarcode(trimmedBarcode)

        // Fetch product from API
        setIsLoading(true)
        try {
            const response = await findProductByBarcode(trimmedBarcode, storeId)

            if (response.err === 0 && response.data) {
                const productData = response.data

                // Check is_active
                if (!productData.is_active) {
                    playBeep('error', 150)
                    toast.error('❌ Sản phẩm đã bị vô hiệu hóa')
                    if (onError) onError('Sản phẩm đã bị vô hiệu hóa')
                    return
                }

                // Success
                playBeep('success', 100)
                toast.success(`✅ Tìm thấy: ${productData.name}`)

                if (onProductScanned) {
                    onProductScanned(productData)
                }

                // Clear input after successful scan
                if (finalConfig.clearInputAfterScan) {
                    setBarcode('')
                }

                // Auto-focus again for next scan
                if (finalConfig.autoFocus && inputRef.current) {
                    inputRef.current.focus()
                }
            } else {
                // Product not found or error
                playBeep('error', 200)
                const errorMsg = response.msg || 'Không tìm thấy sản phẩm'
                toast.error(`❌ ${errorMsg}`)
                if (onError) onError(errorMsg)
            }
        } catch (error) {
            console.error('Error scanning barcode:', error)
            playBeep('error', 150)
            toast.error('❌ Lỗi khi tìm kiếm sản phẩm')
            if (onError) onError('Lỗi hệ thống: ' + error.message)
        } finally {
            setIsLoading(false)
        }
    }, [onProductScanned, onError, storeId, finalConfig])

    /**
     * Xử lý Change event
     * Nếu là từ scanner (Enter), xử lý ngay
     * Nếu là manual, dùng debounce
     */
    const handleInputChange = useCallback((e) => {
        const value = e.target.value
        setBarcode(value)
    }, [])

    /**
     * Xử lý Key Press
     */
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            // Enter: submit barcode (từ scanner hoặc manual input)
            e.preventDefault()
            if (barcode.trim()) {
                // Dùng smart scanner để xử lý
                smartScannerRef.current(barcode.trim())
            }
        } else if (e.key === 'Escape') {
            // Esc: clear input
            setBarcode('')
            if (inputRef.current) {
                inputRef.current.focus()
            }
        }
    }, [barcode])

    /**
     * Clear button
     */
    const handleClear = useCallback(() => {
        setBarcode('')
        scanHistoryRef.current.clear()
        setLastScannedBarcode(null)
        if (inputRef.current) {
            inputRef.current.focus()
        }
    }, [])

    return (
        <div className={`barcode-input-wrapper ${className}`}>
            <InputGroup className="barcode-input-group">
                <InputGroup.Text className="barcode-icon">
                    <FaQrcode />
                </InputGroup.Text>

                <Form.Control
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    value={barcode}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    autoComplete="off"
                    className="barcode-input"
                    style={{
                        fontSize: '14px',
                        padding: '8px 12px',
                        backgroundColor: isLoading ? '#f0f0f0' : '#fff'
                    }}
                />

                {isLoading && (
                    <Button
                        variant="light"
                        disabled
                        className="barcode-spinner-btn"
                    >
                        <Spinner
                            animation="border"
                            size="sm"
                            className="me-2"
                            style={{ width: '14px', height: '14px' }}
                        />
                        Đang tìm...
                    </Button>
                )}

                {!isLoading && barcode && (
                    <Button
                        variant="outline-secondary"
                        onClick={handleClear}
                        className="barcode-clear-btn"
                        title="Xóa (Esc)"
                    >
                        <FaTimes />
                    </Button>
                )}

                {!isLoading && !barcode && (
                    <Button
                        variant="light"
                        disabled
                        className="barcode-hint-btn"
                        style={{ color: '#999', cursor: 'default' }}
                    >
                        Nhấn Enter hoặc Esc
                    </Button>
                )}
            </InputGroup>

            {/* Hint text */}
            <small className="text-muted d-block mt-1">
                💡 Quét barcode trực tiếp từ scanner USB/Bluetooth hoặc nhập SKU rồi nhấn Enter.
                Nhấn Esc để xóa.
                {lastScannedBarcode && (
                    <span className="ms-2">
                        Lần quét cuối: <strong>{lastScannedBarcode}</strong>
                    </span>
                )}
            </small>
        </div>
    )
}

export default BarcodeInput
