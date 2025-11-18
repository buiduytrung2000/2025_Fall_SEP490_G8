'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Thêm trạng thái 'preparing' vào ENUM của cột status trong bảng StoreOrder
    await queryInterface.sequelize.query(`
      ALTER TABLE \`StoreOrder\` 
      MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'preparing', 'shipped', 'delivered', 'cancelled') 
      DEFAULT 'pending';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Xóa trạng thái 'preparing' khỏi ENUM (rollback)
    await queryInterface.sequelize.query(`
      ALTER TABLE \`StoreOrder\` 
      MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'shipped', 'delivered', 'cancelled') 
      DEFAULT 'pending';
    `);
  }
};

