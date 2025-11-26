/**
 * Product API - Barcode Lookup
 */

import axios from 'axios'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1'

/**
 * Tìm sản phẩm theo barcode
 * @param {string} barcode - Barcode to search
 * @param {number} storeId - Store ID for pricing and inventory
 * @returns {Promise<Object>}
 *
 * Response:
 * {
 *   product_id: number,
 *   name: string,
 *   sku: string,
 *   is_active: boolean,
 *   product_unit_id: number | null,
 *   unit_id: number,
 *   unit_name: string,
 *   conversion_to_base: number,
 *   current_price: number,
 *   base_quantity: number,
 *   available_quantity: number,
 *   barcode: string,
 *   matched_by: 'barcode' | 'sku'
 * }
 */
export const findProductByBarcode = async (barcode, storeId) => {
    try {
        const token = localStorage.getItem('token')
        const response = await axios.get(
            `${API_BASE_URL}/product/by-barcode/${encodeURIComponent(barcode)}`,
            {
                params: { store_id: storeId },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )
        return response.data
    } catch (error) {
        if (error.response?.status === 404 || error.response?.data?.err === 1) {
            return {
                err: 1,
                msg: error.response?.data?.msg || 'Không tìm thấy sản phẩm',
                data: null
            }
        }
        console.error('Error finding product by barcode:', error)
        return {
            err: -1,
            msg: error.message || 'Lỗi khi tìm kiếm sản phẩm',
            data: null
        }
    }
}

export default { findProductByBarcode }
