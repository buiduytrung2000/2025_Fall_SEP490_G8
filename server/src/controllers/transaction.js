import * as transactionService from '../services/transaction'

export const checkout = async (req, res) => {
    try {
        const payload = req.body || {}
        // prefer store_id from body, but if user has store in token use it
        if (!payload.store_id && req.user && req.user.store_id) payload.store_id = req.user.store_id
        if (!payload.created_by && req.user && req.user.user_id) payload.created_by = req.user.user_id

        const response = await transactionService.checkout(payload)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({ err: -1, msg: 'Fail at transaction controller: ' + error })
    }
}
