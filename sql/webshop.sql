-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               10.4.32-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.11.0.7065
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for webphoto
CREATE DATABASE IF NOT EXISTS `webphoto` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `webphoto`;

-- Dumping structure for table webphoto.orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `photo_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `rider_id` int(11) DEFAULT NULL,
  `status` enum('PENDING','ASSIGNED','PICKING_UP','DELIVERING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `address` varchar(255) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `total_cents` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_rider_status` (`rider_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table webphoto.orders: ~22 rows (approximately)
INSERT INTO `orders` (`id`, `user_id`, `photo_id`, `quantity`, `rider_id`, `status`, `created_at`, `address`, `phone`, `total_cents`) VALUES
	(1, 3, 3, 1, 1, 'COMPLETED', '2025-12-04 02:31:38', NULL, NULL, 0),
	(2, 1, 2, 1, 1, 'COMPLETED', '2025-12-04 02:32:30', NULL, NULL, 0),
	(3, 1, 1, 1, 1, 'COMPLETED', '2025-12-04 02:43:36', NULL, NULL, 0),
	(4, 1, 1, 4, 1, 'COMPLETED', '2025-12-04 02:45:53', NULL, NULL, 0),
	(5, 2, 2, 4, 1, 'COMPLETED', '2025-12-04 02:46:50', NULL, NULL, 0),
	(6, 2, 1, 1, 1, 'COMPLETED', '2025-12-04 02:46:54', NULL, NULL, 0),
	(7, 1, 4, 1, 1, 'COMPLETED', '2025-12-04 02:52:09', NULL, NULL, 0),
	(8, 1, 2, 1, 1, 'COMPLETED', '2025-12-04 02:55:07', '72 ม.10 ต.ตาลเดี่ยว', '0949613350', 0),
	(9, 1, 1, 1, 1, 'COMPLETED', '2025-12-04 02:57:17', '72 ม.10 ต.ตาลเดี่ยว', '0949613350', 0),
	(10, 1, 2, 1, 1, 'COMPLETED', '2025-12-04 03:27:13', '72 ม.10 ต.ตาลเดี่ยว', '0949613350', 200),
	(11, 2, 4, 1, 1, 'COMPLETED', '2025-12-04 03:32:21', '72 ม.10', '0949613350', 300),
	(12, 1, 4, 1, 1, 'COMPLETED', '2025-12-04 03:46:48', '72 ม.10 ต.ตาลเดี่ยว', '0949613350', 300),
	(13, 2, 4, 2, 1, 'COMPLETED', '2025-12-04 03:47:08', '72 ม.10', '0949613350', 600),
	(14, 2, 2, 1, 1, 'COMPLETED', '2025-12-04 03:48:12', '72 ม.10', '0949613350', 200),
	(15, 1, 4, 1, 1, 'COMPLETED', '2025-12-04 03:49:32', '72 ม.10 ต.ตาลเดี่ยว', '0949613350', 300),
	(16, 2, 4, 1, 1, 'COMPLETED', '2025-12-04 03:52:30', '72 ม.10', '0949613350', 300),
	(17, 1, 4, 1, 1, 'COMPLETED', '2025-12-04 03:52:45', '72 ม.10 ต.ตาลเดี่ยว', '0949613350', 300),
	(18, 1, 4, 1, 1, 'COMPLETED', '2025-12-04 03:55:39', '72 ม.10 ต.ตาลเดี่ยว', '0949613350', 300),
	(19, 1, 1, 1, 1, 'COMPLETED', '2025-12-04 03:59:28', '72 ม.10 ต.ตาลเดี่ยว', '0949613350', 100),
	(20, 1, 1, 1, 1, 'COMPLETED', '2025-12-04 04:13:17', '72 ม.10 ต.ตาลเดี่ยว', '0949613350', 100),
	(21, 1, 4, 1, 1, 'COMPLETED', '2025-12-04 04:31:40', '72 ม.10 ต.ตาลเดี่ยว', '0949613350', 300),
	(22, 1, 4, 1, 1, 'COMPLETED', '2025-12-15 02:32:12', '72 ม.10 ต.ตาลเดี่ยว', '0949613350', 300);

-- Dumping structure for table webphoto.order_status_history
CREATE TABLE IF NOT EXISTS `order_status_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `status` enum('PENDING','ASSIGNED','PICKING_UP','DELIVERING','COMPLETED','CANCELLED') NOT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `changed_by_role` enum('USER','RIDER','SYSTEM','ADMIN') NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table webphoto.order_status_history: ~107 rows (approximately)
INSERT INTO `order_status_history` (`id`, `order_id`, `status`, `changed_by`, `changed_by_role`, `note`, `created_at`) VALUES
	(1, 1, 'PENDING', 3, 'USER', 'Order created', '2025-12-04 02:31:38'),
	(2, 2, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 02:32:30'),
	(3, 2, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 02:39:56'),
	(4, 2, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 02:39:59'),
	(5, 2, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 02:40:00'),
	(6, 2, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 02:40:01'),
	(7, 1, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 02:40:04'),
	(8, 1, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 02:43:30'),
	(9, 3, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 02:43:36'),
	(10, 1, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 02:43:51'),
	(11, 1, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 02:43:53'),
	(12, 3, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 02:43:57'),
	(13, 3, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 02:44:02'),
	(14, 3, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 02:44:09'),
	(15, 3, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 02:44:13'),
	(16, 4, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 02:45:53'),
	(17, 4, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 02:46:00'),
	(18, 4, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 02:46:05'),
	(19, 4, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 02:46:08'),
	(20, 4, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 02:46:13'),
	(21, 5, 'PENDING', 2, 'USER', 'Order created', '2025-12-04 02:46:50'),
	(22, 6, 'PENDING', 2, 'USER', 'Order created', '2025-12-04 02:46:54'),
	(23, 5, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 02:47:03'),
	(24, 6, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 02:47:13'),
	(25, 5, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 02:47:14'),
	(26, 6, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 02:47:22'),
	(27, 6, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 02:47:24'),
	(28, 5, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 02:47:29'),
	(29, 5, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 02:47:29'),
	(30, 6, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 02:47:30'),
	(31, 7, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 02:52:09'),
	(32, 7, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 02:52:17'),
	(33, 7, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 02:52:18'),
	(34, 7, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 02:52:19'),
	(35, 7, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 02:52:20'),
	(36, 8, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 02:55:07'),
	(37, 8, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 02:55:18'),
	(38, 8, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 02:55:21'),
	(39, 8, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 02:55:24'),
	(40, 8, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 02:55:29'),
	(41, 9, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 02:57:17'),
	(42, 9, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 02:57:35'),
	(43, 9, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 02:57:36'),
	(44, 9, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 02:57:36'),
	(45, 9, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 02:57:37'),
	(46, 10, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 03:27:13'),
	(47, 11, 'PENDING', 2, 'USER', 'Order created', '2025-12-04 03:32:21'),
	(48, 11, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 03:33:18'),
	(49, 10, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 03:33:19'),
	(50, 11, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 03:33:20'),
	(51, 11, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 03:33:20'),
	(52, 10, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 03:33:21'),
	(53, 10, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 03:33:21'),
	(54, 11, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 03:33:22'),
	(55, 10, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 03:33:22'),
	(56, 12, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 03:46:48'),
	(57, 13, 'PENDING', 2, 'USER', 'Order created', '2025-12-04 03:47:08'),
	(58, 14, 'PENDING', 2, 'USER', 'Order created', '2025-12-04 03:48:12'),
	(59, 15, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 03:49:32'),
	(60, 16, 'PENDING', 2, 'USER', 'Order created', '2025-12-04 03:52:30'),
	(61, 17, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 03:52:45'),
	(62, 12, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 03:52:52'),
	(63, 13, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 03:53:14'),
	(64, 18, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 03:55:39'),
	(65, 14, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 03:55:42'),
	(66, 15, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 03:55:42'),
	(67, 16, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 03:55:43'),
	(68, 17, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 03:55:43'),
	(69, 18, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 03:55:43'),
	(70, 18, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 03:55:45'),
	(71, 18, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 03:55:45'),
	(72, 18, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 03:55:45'),
	(73, 17, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 03:55:46'),
	(74, 17, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 03:55:46'),
	(75, 17, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 03:55:46'),
	(76, 16, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 03:55:46'),
	(77, 16, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 03:55:46'),
	(78, 16, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 03:55:47'),
	(79, 15, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 03:55:47'),
	(80, 15, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 03:55:47'),
	(81, 15, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 03:55:47'),
	(82, 14, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 03:55:47'),
	(83, 14, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 03:55:47'),
	(84, 14, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 03:55:48'),
	(85, 13, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 03:55:48'),
	(86, 13, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 03:55:48'),
	(87, 13, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 03:55:48'),
	(88, 12, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 03:55:48'),
	(89, 12, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 03:55:49'),
	(90, 12, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 03:55:49'),
	(91, 19, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 03:59:28'),
	(92, 19, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 03:59:34'),
	(93, 19, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 03:59:35'),
	(94, 19, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 03:59:35'),
	(95, 19, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 03:59:36'),
	(96, 20, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 04:13:17'),
	(97, 20, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 04:13:20'),
	(98, 20, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 04:13:20'),
	(99, 20, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 04:13:21'),
	(100, 20, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-04 04:13:21'),
	(101, 21, 'PENDING', 1, 'USER', 'Order created', '2025-12-04 04:31:40'),
	(102, 21, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-04 04:31:46'),
	(103, 21, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-04 04:31:48'),
	(104, 21, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-04 04:31:49'),
	(105, 21, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-08 02:10:15'),
	(106, 22, 'PENDING', 1, 'USER', 'Order created', '2025-12-15 02:32:12'),
	(107, 22, 'ASSIGNED', 1, 'RIDER', 'Rider accepted', '2025-12-15 02:32:15'),
	(108, 22, 'PICKING_UP', 1, 'RIDER', NULL, '2025-12-15 02:32:16'),
	(109, 22, 'DELIVERING', 1, 'RIDER', NULL, '2025-12-15 02:32:16'),
	(110, 22, 'COMPLETED', 1, 'RIDER', NULL, '2025-12-15 02:32:17');

-- Dumping structure for table webphoto.photos
CREATE TABLE IF NOT EXISTS `photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `url` varchar(1024) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `price_cents` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table webphoto.photos: ~3 rows (approximately)
INSERT INTO `photos` (`id`, `url`, `created_at`, `price_cents`) VALUES
	(1, '/Hamburger.png', '2025-12-04 02:31:20', 100),
	(2, '/fish.png', '2025-12-04 02:31:20', 200),
	(4, 'https://img5.pic.in.th/file/secure-sv1/pngtree-group-of-fast-food-products-png-image_14008130.png', '2025-12-04 02:51:17', 300);

-- Dumping structure for table webphoto.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(191) NOT NULL,
  `password` varchar(255) NOT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_rider` tinyint(1) NOT NULL DEFAULT 0,
  `phone` varchar(30) DEFAULT NULL,
  `rider_status` enum('AVAILABLE','BUSY','OFFLINE') NOT NULL DEFAULT 'OFFLINE',
  `credit_cents` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table webphoto.users: ~3 rows (approximately)
INSERT INTO `users` (`id`, `username`, `password`, `is_admin`, `created_at`, `is_rider`, `phone`, `rider_status`, `credit_cents`) VALUES
	(1, 'gap', '$2b$10$uiHZbVGr7wXV/bPmN4RbmOxLXs77hf/6vsw7dhh9DMJ9Uc0goUDCe', 1, '2025-12-04 02:31:53', 1, NULL, 'AVAILABLE', 8900),
	(2, 'gap2', '$2b$10$5xG3bLbmlmKrH.00cDbs0eFaNxw0FQXmwUAHAcbaoXOW/Tefyfj86', 0, '2025-12-04 02:46:42', 1, NULL, 'AVAILABLE', 9600),
	(3, 'gap12121', '$2b$10$FGQojDxanQpg3KZEAoPSIuFYaBBN5ynbSq.LEuRbFfVfB8.YYNEw2', 0, '2025-12-15 02:32:00', 0, NULL, 'OFFLINE', 0);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
