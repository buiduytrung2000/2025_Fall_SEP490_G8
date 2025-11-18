'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Thêm trạng thái 'preparing' vào ENUM của cột status trong bảng Order
    await queryInterface.sequelize.query(`
      ALTER TABLE \`Order\` 
      MODIFY COLUMN status ENUM('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled') 
      DEFAULT 'pending';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Xóa trạng thái 'preparing' khỏi ENUM (rollback)
    await queryInterface.sequelize.query(`
      ALTER TABLE \`Order\` 
      MODIFY COLUMN status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') 
      DEFAULT 'pending';
    `);
  }
};

