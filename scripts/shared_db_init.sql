-- ============================================
-- 小牛 × 小八 共享工作台 数据库
-- 导入方法：宝塔面板 → 数据库 → phpMyAdmin → 导入此文件
-- ============================================

CREATE DATABASE IF NOT EXISTS niu_workspace DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE niu_workspace;

-- 用户表（爹和小八爹）
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  role ENUM('dad', 'xiao8_dad') NOT NULL DEFAULT 'dad',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Agent 表（小牛和小八）
CREATE TABLE IF NOT EXISTS agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  emoji VARCHAR(10),
  owner_id INT NOT NULL,
  device_info VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 每日待办
CREATE TABLE IF NOT EXISTS todos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  agent_id INT,
  text VARCHAR(500) NOT NULL,
  date DATE NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
  estimated_minutes INT,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  INDEX idx_date (date),
  INDEX idx_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 想法/创意池
CREATE TABLE IF NOT EXISTS ideas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  agent_id INT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  status ENUM('draft', 'reviewing', 'approved', 'in_progress', 'done', 'archived') DEFAULT 'draft',
  priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
  source_agent VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 学习资料
CREATE TABLE IF NOT EXISTS learning_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  agent_id INT,
  title VARCHAR(300) NOT NULL,
  url VARCHAR(1000),
  description TEXT,
  category VARCHAR(50),
  status ENUM('todo', 'in_progress', 'done', 'archived') DEFAULT 'todo',
  priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
  estimated_hours DECIMAL(5,1),
  notes TEXT,
  source_agent VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初始化用户
INSERT INTO users (username, display_name, role) VALUES
  ('dad', '爹', 'dad'),
  ('xiao8_dad', '小八爹', 'xiao8_dad')
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name);

-- 初始化 Agent
INSERT INTO agents (name, emoji, owner_id, device_info) VALUES
  ('小牛', '🐮', 1, 'Sky要暴富 / Windows'),
  ('小八', '🐙', 2, '小八设备 / Mac')
ON DUPLICATE KEY UPDATE emoji=VALUES(emoji);

-- 创建 API 用户
CREATE USER IF NOT EXISTS 'niu_api'@'%' IDENTIFIED BY 'Niu2Xiao8@2026!';
GRANT SELECT, INSERT, UPDATE, DELETE ON niu_workspace.* TO 'niu_api'@'%';
CREATE USER IF NOT EXISTS 'niu_api'@'localhost' IDENTIFIED BY 'Niu2Xiao8@2026!';
GRANT SELECT, INSERT, UPDATE, DELETE ON niu_workspace.* TO 'niu_api'@'localhost';
FLUSH PRIVILEGES;

-- 示例数据：爹的每日待办
INSERT INTO todos (user_id, agent_id, text, date, done, priority, estimated_minutes) VALUES
  (1, 1, '谷歌+Meta广告数据统计 & 群汇报', CURDATE(), FALSE, 'high', 10),
  (1, 1, '社媒客诉售后处理', CURDATE(), FALSE, 'high', 60),
  (1, 1, '易点天下充值广告账户', CURDATE(), FALSE, 'medium', 10),
  (1, 1, '社媒帖子发布', CURDATE(), FALSE, 'medium', 30),
  (1, 1, '谷歌广告数据 & 素材分析', CURDATE(), FALSE, 'high', 100);

-- 示例数据：学习计划
INSERT INTO learning_items (user_id, agent_id, title, category, status, priority, estimated_hours) VALUES
  (1, 1, 'OpenClaw Agent 开发入门', 'AI开发', 'todo', 'high', 8.0),
  (1, 1, 'SEO 优化进阶技巧', '运营', 'in_progress', 'medium', 5.0),
  (1, 1, 'Google Ads 高级投放策略', '广告', 'todo', 'high', 10.0);
