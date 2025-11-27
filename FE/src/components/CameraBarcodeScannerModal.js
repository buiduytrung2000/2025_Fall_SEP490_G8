/**
 * CameraBarcodeScannerModal Component
 * Modal để quét barcode/QR code bằng webcam
 * Hỗ trợ quét EAN-13, QR Code, và SKU
 * 
 * Cách sử dụng:
 * <CameraBarcodeScannerModal 
 *     show={true}
 *     onProductScanned={(productData) => { console.log(productData) }}
 *     storeId={1}
 *     onClose={() => {}}
 * />
 * 
 * Yêu cầu: cài đặt package jsQR
 * npm install jsqr
 */

import React, { useRef, useEffect, useState } from 'react'
import { Modal, Button, Alert, Spinner, ListGroup, Badge } from 'react-bootstrap'
import { FaCamera, FaCheckCircle, FaTimesCircle, FaLightbulb } from 'react-icons/fa'
import '../assets/CameraBarcodeScannerModal.css'
import { findProductByBarcode } from '../api/barcodeApi'
import { playBeep } from '../utils/barcodeScanner'
import { toast } from 'react-toastify'

// Tải JSQr library (QR code decoder)
const loadJsQr = () => {
    return new Promise((resolve) => {
        if (window.jsQR) {
            resolve(window.jsQR)
        } else {
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
            script.onload = () => resolve(window.jsQR)
            script.onerror = () => {
                console.error('Failed to load jsQR library')
                resolve(null)
            }
            document.head.appendChild(script)
        }
    })
}

const CameraBarcodeScannerModal = ({
    show = false,
    onProductScanned,
    onError,
    storeId,
    onClose
}) => {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState(null)
    const [cameraPermission, setCameraPermission] = useState('pending') // 'pending', 'granted', 'denied'
    const [facingMode, setFacingMode] = useState('environment') // 'environment' (back), 'user' (front)
    const [scannedData, setScannedData] = useState(null)
    const [lastScannedCode, setLastScannedCode] = useState(null)
    const [scanHistory, setScanHistory] = useState([])
    const [detectedFormats, setDetectedFormats] = useState([])
    const [isProcessing, setIsProcessing] = useState(false)
    const streamRef = useRef(null)
    const scanIntervalRef = useRef(null)
    const jsQrRef = useRef(null)

    // Load JSQr library khi component mount
    useEffect(() => {
        loadJsQr().then(jsQR => {
            jsQrRef.current = jsQR
        })
    }, [])

    // Yêu cầu quyền truy cập camera
    const requestCameraPermission = async () => {
        try {
            setCameraPermission('pending')
            setError(null)
            
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            streamRef.current = stream
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play()
                    setCameraPermission('granted')
                    setIsScanning(true)
                    startScanning()
                }
            }
        } catch (err) {
            console.error('Camera permission error:', err)
            setCameraPermission('denied')
            
            if (err.name === 'NotAllowedError') {
                setError('❌ Bạn chưa cho phép truy cập camera. Vui lòng kiểm tra cài đặt quyền.')
            } else if (err.name === 'NotFoundError') {
                setError('❌ Không tìm thấy camera trên thiết bị. Vui lòng kiểm tra kết nối.')
            } else if (err.name === 'NotReadableError') {
                setError('❌ Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng đó.')
            } else {
                setError(`❌ Lỗi: ${err.message}`)
            }
            
            if (onError) onError(err)
        }
    }

    // Bắt đầu quét barcode/QR code
    const startScanning = () => {
        if (!videoRef.current || !canvasRef.current) return
        
        setIsScanning(true)
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        const scan = () => {
            if (!videoRef.current || !isScanning) return

            // Thiết lập canvas size theo video
            canvas.width = videoRef.current.videoWidth
            canvas.height = videoRef.current.videoHeight

            // Vẽ frame video lên canvas
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

            // Lấy image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

            // Quét QR code
            if (jsQrRef.current) {
                const qrCode = jsQrRef.current.default(imageData.data, canvas.width, canvas.height)
                if (qrCode && qrCode.data) {
                    handleScannedCode(qrCode.data, 'QR Code')
                    return
                }
            }

            // Quét barcode 1D (simple detection - search cho số dãy dài)
            const barcodeCode = detectBarcode1D(imageData, canvas.width, canvas.height)
            if (barcodeCode) {
                handleScannedCode(barcodeCode, 'Barcode 1D')
                return
            }

            // Tiếp tục quét
            scanIntervalRef.current = requestAnimationFrame(scan)
        }

        scanIntervalRef.current = requestAnimationFrame(scan)
    }

    // Dừng quét
    const stopScanning = () => {
        setIsScanning(false)
        if (scanIntervalRef.current) {
            cancelAnimationFrame(scanIntervalRef.current)
            scanIntervalRef.current = null
        }
    }

    // Đơn giản detect barcode 1D (tìm pattern của barcode: dark-light-dark)
    const detectBarcode1D = (imageData, width, height) => {
        try {
            const data = imageData.data
            
            // Scan từ trên xuống dưới để tìm barcode pattern
            for (let y = height / 4; y < (height * 3) / 4; y++) {
                let scanLine = ''
                let currentColor = null
                let count = 0

                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4
                    const r = data[idx]
                    const g = data[idx + 1]
                    const b = data[idx + 2]
                    
                    // Grayscale
                    const gray = (r + g + b) / 3
                    const isBlack = gray < 128

                    if (currentColor === null) {
                        currentColor = isBlack
                        count = 1
                    } else if (currentColor === isBlack) {
                        count++
                    } else {
                        scanLine += count
                        currentColor = isBlack
                        count = 1
                    }
                }
                if (count > 0) scanLine += count

                // Nếu find pattern có dấu hiệu barcode (nhiều bars)
                if (scanLine.length > 30) {
                    return null // Return null, dùng manual input thay vì detection
                }
            }

            return null
        } catch (err) {
            console.error('Barcode detection error:', err)
            return null
        }
    }

    // Xử lý code quét được
    const handleScannedCode = async (code, format) => {
        // Kiểm tra duplicate (tránh quét lặp lại liên tục)
        if (lastScannedCode === code && Date.now() - (scannedData?.timestamp || 0) < 500) {
            return
        }

        setLastScannedCode(code)
        setIsProcessing(true)

        try {
            // Phát beep success
            playBeep('success', 100)

            // Update history
            setScanHistory(prev => [
                { code, format, timestamp: new Date().toLocaleTimeString() },
                ...prev.slice(0, 9)
            ])

            // Tìm sản phẩm từ barcode
            const response = await findProductByBarcode(code, storeId)
            
            if (response && response.err === 0 && response.data) {
                const productData = response.data
                
                setScannedData({
                    code,
                    format,
                    product: productData,
                    timestamp: Date.now()
                })

                toast.success(`✅ Tìm thấy: ${productData.name}`)
                playBeep('success', 100)

                // Gọi callback
                if (onProductScanned) {
                    onProductScanned(productData)
                    setTimeout(() => {
                        setScannedData(null)
                    }, 2000)
                }
            } else {
                const errorMsg = response?.msg || 'Không tìm thấy sản phẩm'
                setScannedData({
                    code,
                    format,
                    error: errorMsg,
                    timestamp: Date.now()
                })
                
                toast.error(`❌ ${errorMsg}`)
                playBeep('error', 150)
                
                if (onError) onError(errorMsg)
            }
        } catch (err) {
            console.error('Error processing scanned code:', err)
            toast.error('❌ Lỗi xử lý mã quét')
            playBeep('error', 150)
        } finally {
            setIsProcessing(false)
        }
    }

    // Chuyển đổi camera (trước/sau)
    const toggleFacingMode = async () => {
        stopScanning()
        stopCamera()
        
        const newMode = facingMode === 'environment' ? 'user' : 'environment'
        setFacingMode(newMode)
        setScannedData(null)
        
        setTimeout(() => {
            requestCameraPermission()
        }, 500)
    }

    // Đóng camera
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        stopScanning()
    }

    // Đóng modal
    const handleClose = () => {
        stopCamera()
        setScannedData(null)
        setScanHistory([])
        setDetectedFormats([])
        onClose()
    }

    // Khi modal mở, yêu cầu quyền camera
    useEffect(() => {
        if (show) {
            setError(null)
            setScannedData(null)
            setScanHistory([])
            requestCameraPermission()
        } else {
            stopCamera()
        }

        return () => {
            stopCamera()
        }
    }, [show])

    return (
        <Modal show={show} onHide={handleClose} fullscreen className="camera-barcode-modal">
            <Modal.Header closeButton>
                <Modal.Title>
                    <FaCamera className="me-2" />
                    Quét Mã Vạch/QR Code bằng Webcam
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="camera-modal-body">
                {/* Camera Preview */}
                <div className="camera-preview-container">
                    {cameraPermission === 'granted' && (
                        <>
                            <video
                                ref={videoRef}
                                className="camera-video"
                                autoPlay
                                playsInline
                            />
                            <canvas
                                ref={canvasRef}
                                className="camera-canvas"
                                style={{ display: 'none' }}
                            />
                            
                            {/* Overlay hướng dẫn */}
                            <div className="camera-overlay">
                                <div className="camera-frame">
                                    <p className="camera-hint">
                                        <FaLightbulb /> Đặt mã vạch/QR code vào khung để quét
                                    </p>
                                </div>
                            </div>

                            {/* Loading indicator khi đang xử lý */}
                            {isProcessing && (
                                <div className="camera-processing">
                                    <Spinner animation="border" variant="success" />
                                    <p>Đang xử lý...</p>
                                </div>
                            )}
                        </>
                    )}

                    {cameraPermission === 'pending' && (
                        <div className="camera-loading">
                            <Spinner animation="border" variant="primary" />
                            <p>Đang kết nối camera...</p>
                        </div>
                    )}

                    {cameraPermission === 'denied' && (
                        <div className="camera-denied">
                            <Alert variant="danger" className="mb-3">
                                {error || '❌ Không thể kết nối camera'}
                            </Alert>
                            <div className="camera-setup-guide">
                                <h5>🔧 Cách cho phép truy cập camera:</h5>
                                <ol>
                                    <li>Nhấp vào biểu tượng khoá 🔒 ở thanh địa chỉ URL</li>
                                    <li>Chọn "Cài đặt" hoặc "Tùy chọn"</li>
                                    <li>Tìm "Camera" và chọn "Cho phép"</li>
                                    <li>Tải lại trang web</li>
                                </ol>
                                <p className="text-muted">
                                    <small>
                                        Hoặc, nếu camera không được phát hiện:
                                        Kiểm tra kết nối camera USB hoặc webcam tích hợp
                                    </small>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Kết quả quét */}
                {scannedData && (
                    <div className={`scan-result ${scannedData.error ? 'error' : 'success'}`}>
                        {scannedData.error ? (
                            <>
                                <FaTimesCircle className="result-icon error-icon" />
                                <h5>Lỗi</h5>
                                <p>{scannedData.error}</p>
                            </>
                        ) : (
                            <>
                                <FaCheckCircle className="result-icon success-icon" />
                                <h5>✅ Quét thành công!</h5>
                                <div className="product-info">
                                    <p>
                                        <strong>Mã:</strong> {scannedData.code}
                                        <Badge bg="info" className="ms-2">
                                            {scannedData.format}
                                        </Badge>
                                    </p>
                                    <p>
                                        <strong>Sản phẩm:</strong> {scannedData.product?.name}
                                    </p>
                                    <p>
                                        <strong>SKU:</strong> {scannedData.product?.sku}
                                    </p>
                                    <p>
                                        <strong>Giá:</strong>{' '}
                                        {new Intl.NumberFormat('vi-VN', {
                                            style: 'currency',
                                            currency: 'VND'
                                        }).format(scannedData.product?.current_price)}
                                    </p>
                                    <p>
                                        <strong>Tồn kho:</strong> {scannedData.product?.available_quantity}{' '}
                                        {scannedData.product?.unit_name}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Lịch sử quét */}
                {scanHistory.length > 0 && (
                    <div className="scan-history">
                        <h6>📋 Lịch sử quét (10 lần gần nhất)</h6>
                        <ListGroup>
                            {scanHistory.map((item, idx) => (
                                <ListGroup.Item key={idx} className="scan-history-item">
                                    <div className="scan-history-content">
                                        <code className="scan-code">{item.code}</code>
                                        <Badge bg="secondary">{item.format}</Badge>
                                    </div>
                                    <small className="text-muted">{item.timestamp}</small>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer>
                {cameraPermission === 'granted' && (
                    <>
                        <Button
                            variant="outline-secondary"
                            onClick={toggleFacingMode}
                            disabled={isProcessing}
                        >
                            🔄 Chuyển camera ({facingMode === 'environment' ? 'Sau' : 'Trước'})
                        </Button>
                        <Button
                            variant={isScanning ? 'warning' : 'success'}
                            onClick={() => {
                                if (isScanning) {
                                    stopScanning()
                                } else {
                                    startScanning()
                                }
                            }}
                            disabled={isProcessing || cameraPermission !== 'granted'}
                        >
                            {isScanning ? '⏸️ Dừng quét' : '▶️ Bắt đầu quét'}
                        </Button>
                    </>
                )}
                {cameraPermission === 'denied' && (
                    <Button
                        variant="primary"
                        onClick={requestCameraPermission}
                    >
                        🔄 Thử lại
                    </Button>
                )}
                <Button variant="secondary" onClick={handleClose}>
                    Đóng
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

export default CameraBarcodeScannerModal
