/**
 * Barcode Scanner Utilities
 * Hỗ trợ xử lý input từ scanner, validation, normalization, và feedback âm thanh
 */

// ============================================================================
// 1. BARCODE VALIDATION & NORMALIZATION
// ============================================================================

/**
 * Normalize barcode: trim, remove spaces, validate length
 * @param {string} barcode - Raw barcode from scanner
 * @returns {Object} { valid: boolean, normalized: string, error: string }
 */
export const normalizeBarcode = (barcode) => {
    if (!barcode) {
        return { valid: false, normalized: '', error: 'Barcode không được rỗng' }
    }

    const normalized = barcode.trim().replace(/\s+/g, '')

    // Validation rules
    const rules = {
        minLength: 6,
        maxLength: 128,
        allowedChars: /^[0-9A-Za-z\-_]+$/ // Alphanumeric + dash + underscore
    }

    if (normalized.length < rules.minLength) {
        return {
            valid: false,
            normalized,
            error: `Barcode quá ngắn (tối thiểu ${rules.minLength} ký tự)`
        }
    }

    if (normalized.length > rules.maxLength) {
        return {
            valid: false,
            normalized,
            error: `Barcode quá dài (tối đa ${rules.maxLength} ký tự)`
        }
    }

    if (!rules.allowedChars.test(normalized)) {
        return {
            valid: false,
            normalized,
            error: 'Barcode chứa ký tự không hợp lệ'
        }
    }

    return { valid: true, normalized, error: null }
}

/**
 * Validate barcode format (EAN-13, UPC-A/E, Code 128)
 * @param {string} barcode - Barcode to validate
 * @returns {Object} { valid: boolean, format: string, error: string }
 */
export const validateBarcodeFormat = (barcode) => {
    const normalized = barcode.trim()

    // EAN-13: 13 digits
    if (/^\d{13}$/.test(normalized)) {
        return { valid: true, format: 'EAN-13', error: null }
    }

    // UPC-A: 12 digits
    if (/^\d{12}$/.test(normalized)) {
        return { valid: true, format: 'UPC-A', error: null }
    }

    // UPC-E: 8 digits (sometimes 12 with leading/trailing 0)
    if (/^\d{8}$/.test(normalized)) {
        return { valid: true, format: 'UPC-E', error: null }
    }

    // Code 128: More flexible, allows uppercase alphanumeric
    if (/^[0-9A-Z]{6,}$/.test(normalized)) {
        return { valid: true, format: 'Code128', error: null }
    }

    // SKU fallback: Any alphanumeric >= 6 chars
    if (/^[0-9A-Za-z_\-]{6,}$/.test(normalized)) {
        return { valid: true, format: 'Custom/SKU', error: null }
    }

    return { valid: false, format: null, error: 'Định dạng barcode không được hỗ trợ' }
}

/**
 * Calculate Luhn checksum for EAN/UPC (tùy chọn validation)
 * @param {string} barcode - Barcode to check
 * @returns {boolean}
 */
export const validateLuhnChecksum = (barcode) => {
    if (!/^\d{8,14}$/.test(barcode)) return false

    let sum = 0
    let alternate = false

    for (let i = barcode.length - 1; i >= 0; i--) {
        let digit = parseInt(barcode.charAt(i), 10)

        if (alternate) {
            digit *= 2
            if (digit > 9) {
                digit -= 9
            }
        }

        sum += digit
        alternate = !alternate
    }

    return sum % 10 === 0
}

// ============================================================================
// 2. DEBOUNCE & THROTTLE for Scanner Input
// ============================================================================

/**
 * Debounce scanner input để chống nhân đôi
 * Dùng cho manual input hoặc chậm scanner
 * @param {Function} callback - Function to call after debounce
 * @param {number} delay - Delay in milliseconds (default 300ms)
 * @returns {Function} - Debounced function
 */
export const createDebouncedScanner = (callback, delay = 300) => {
    let timeoutId

    return (barcode) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
            callback(barcode)
        }, delay)
    }
}

/**
 * Throttle scanner input để giới hạn tốc độ xử lý
 * Dùng cho scanner cơ học nhanh (5-10 scans/giây)
 * @param {Function} callback - Function to call after throttle
 * @param {number} interval - Throttle interval in milliseconds (default 150ms)
 * @returns {Function} - Throttled function
 */
export const createThrottledScanner = (callback, interval = 150) => {
    let lastCallTime = 0

    return (barcode) => {
        const now = Date.now()
        if (now - lastCallTime >= interval) {
            lastCallTime = now
            callback(barcode)
        }
    }
}

/**
 * Combined debounce + throttle
 * Hiệu quả nhất cho scanner thực tế
 * @param {Function} callback
 * @param {number} debounceDelay - Debounce delay (150-300ms)
 * @param {number} throttleInterval - Throttle interval (100-200ms)
 * @returns {Function}
 */
export const createSmartScanner = (callback, debounceDelay = 200, throttleInterval = 150) => {
    let timeoutId
    let lastCallTime = 0

    return (barcode) => {
        const now = Date.now()

        clearTimeout(timeoutId)

        if (now - lastCallTime >= throttleInterval) {
            lastCallTime = now
            callback(barcode)
        } else {
            timeoutId = setTimeout(() => {
                lastCallTime = Date.now()
                callback(barcode)
            }, debounceDelay)
        }
    }
}

// ============================================================================
// 3. AUDIO FEEDBACK
// ============================================================================

/**
 * Play beep sound for scanner feedback
 * @param {string} type - 'success' | 'error' | 'warning'
 * @param {number} duration - Duration in milliseconds (default 100ms)
 */
export const playBeep = (type = 'success', duration = 100) => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Frequency by type
        const frequencies = {
            success: 800,  // Higher pitch
            error: 400,    // Lower pitch
            warning: 600   // Medium pitch
        }

        oscillator.frequency.value = frequencies[type] || 800
        oscillator.type = 'sine'

        // Volume
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + duration / 1000)
    } catch (error) {
        // Browser không hỗ trợ Web Audio API, im lặng
        console.debug('Web Audio API not available:', error)
    }
}

// ============================================================================
// 4. DUPLICATE DETECTION
// ============================================================================

/**
 * Detect duplicate scans in short time window
 * @param {string} currentBarcode
 * @param {string} previousBarcode
 * @param {number} timeWindowMs - Window to consider as duplicate (default 500ms)
 * @returns {boolean} - true if duplicate
 */
export const isDuplicate = (currentBarcode, previousBarcode, timeWindowMs = 500) => {
    return currentBarcode === previousBarcode && timeWindowMs > 0
}

/**
 * Track scan history for duplicate detection
 * @returns {Object} - { push: Function, isDuplicate: Function, clear: Function }
 */
export const createScanHistory = (windowSize = 3) => {
    const history = []
    const timestamps = []

    return {
        push: (barcode) => {
            history.push(barcode)
            timestamps.push(Date.now())

            if (history.length > windowSize) {
                history.shift()
                timestamps.shift()
            }
        },

        isDuplicate: (barcode, timeWindowMs = 500) => {
            if (history.length === 0) return false

            const lastBarcode = history[history.length - 1]
            const lastTime = timestamps[timestamps.length - 1]

            return lastBarcode === barcode && (Date.now() - lastTime) < timeWindowMs
        },

        getLastBarcode: () => history.length > 0 ? history[history.length - 1] : null,

        getLastTime: () => timestamps.length > 0 ? timestamps[timestamps.length - 1] : null,

        clear: () => {
            history.length = 0
            timestamps.length = 0
        }
    }
}

// ============================================================================
// 5. SCANNER CONFIGURATION HELPERS
// ============================================================================

/**
 * Get default POS scanner config
 * @returns {Object}
 */
export const getDefaultScannerConfig = () => ({
    enableSound: true,
    beepType: 'success',
    debounceDelay: 200,
    throttleInterval: 150,
    validateFormat: true,
    allowOversell: false,
    enableCameraScan: false,
    autoFocusInput: true,
    clearInputAfterScan: true,
    duplicateCheckWindowMs: 500
})

/**
 * Merge custom config with defaults
 * @param {Object} customConfig
 * @returns {Object}
 */
export const mergeScannerConfig = (customConfig) => {
    return {
        ...getDefaultScannerConfig(),
        ...customConfig
    }
}
