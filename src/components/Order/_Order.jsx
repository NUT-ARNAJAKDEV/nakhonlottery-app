import React, { useState, useEffect, useRef } from 'react';
import styles from './Order.module.css';
import { FaMinus, FaEye, FaEyeLowVision, FaPlus, FaPenToSquare, FaTrash, FaSistrix, FaListCheck, FaXmark, FaClock, FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import { db } from '../../firebaseConfig';
import 'animate.css';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

function Order() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [orderList, setOrderList] = useState([]);
    const [newOrder, setNewOrder] = useState({
        id: '',       // ฟิลด์ id ที่เป็นเลข 6 หลัก
        amount: '',
        imageUrl: '',
    });
    const [showAllProducts, setShowAllProducts] = useState(false);
    const [displayCount, setDisplayCount] = useState(4); // Default number of products to show
    const h3Ref = useRef(null);
    const [currentDocId, setCurrentDocId] = useState(null); // Document ID ของ Firestore
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // เพิ่ม state สำหรับรถเข็น
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingCart, setLoadingCart] = useState(false);

    // เพิ่ม state ที่ด้านบนของคอมโพเนนต์
    const [shippingMethod, setShippingMethod] = useState('domestic');
    const [internationalAddress, setInternationalAddress] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showActionDialog, setShowActionDialog] = useState(false);

    // คำนวณยอดรวมต่างๆ
    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
    const totalProductPrice = cartItems.reduce((total, item) => total + (80 * item.quantity), 0);
    const shippingCost = cartItems.reduce((total, item) => {
        const itemShippingCost = shippingMethod === 'domestic' ? 25 : 50;
        return total + (itemShippingCost * item.quantity);
    }, 0);
    const totalPrice = totalProductPrice + shippingCost;
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('orderId'); // 'orderId' or 'productId'

    // เพิ่ม state ที่ด้านบนของคอมโพเนนต์
    const [paymentData, setPaymentData] = useState({
        accountNumber: '',
        accountName: '',
        paymentDate: '',
        paymentTime: ''
    });
    // เพิ่ม state ที่ด้านบนของคอมโพเนนต์
    const [isOrderListOpen, setIsOrderListOpen] = useState(false);
    const [allOrders, setAllOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'domestic', 'international'

    // ฟังก์ชันโหลดคำสั่งซื้อทั้งหมด
    const loadAllOrders = async () => {
        setLoadingOrders(true);
        try {
            // ดึงข้อมูลทั้งจาก requests และ request_address
            const [domesticSnapshot, internationalSnapshot] = await Promise.all([
                getDocs(collection(db, 'requests')),
                getDocs(collection(db, 'request_address'))
            ]);

            const domesticOrders = domesticSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'domestic',
                status: doc.data().status || 'pending' // ค่าเริ่มต้นถ้าไม่มี status
            }));

            const internationalOrders = internationalSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'international',
                status: doc.data().status || 'pending' // ค่าเริ่มต้นถ้าไม่มี status
            }));

            setAllOrders([...domesticOrders, ...internationalOrders]);
        } catch (error) {
            console.error('Error loading orders:', error);
            alert('เกิดข้อผิดพลาดในการโหลดคำสั่งซื้อ: ' + error.message);
        } finally {
            setLoadingOrders(false);
        }
    };

    // ฟังก์ชันเปิด/ปิดหน้าต่างรายการสั่งซื้อ
    const toggleOrderList = async () => {
        const newState = !isOrderListOpen;
        setIsOrderListOpen(newState);

        if (newState) {
            await loadAllOrders();
        }
    };

    // ฟังก์ชันอัปเดตสถานะคำสั่งซื้อ
    const updateOrderStatus = async (orderId, status) => {
        try {
            const order = allOrders.find(o => o.id === orderId);
            if (!order) return;

            // ระบุคอลเลกชันตามประเภทคำสั่งซื้อ
            const collectionName = order.type === 'domestic' ? 'requests' : 'request_address';
            const orderRef = doc(db, collectionName, orderId);

            await updateDoc(orderRef, {
                status: status,
                updatedAt: new Date()
            });

            // อัปเดต state
            setAllOrders(allOrders.map(o =>
                o.id === orderId ? { ...o, status: status } : o
            ));

        } catch (error) {
            console.error('Error updating order status:', error);
            alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + error.message);
        }
    };
    // ตรวจสอบสถานะการล็อกอินของผู้ใช้
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                loadCartItems(user.email);
            } else {
                setCartItems([]);
            }
        });
        return () => unsubscribe();
    }, []);


    // โหลดข้อมูลรถเข็นจาก Firestore
    const loadCartItems = async (userEmail) => {
        setLoadingCart(true);
        try {
            const now = new Date();
            const q = query(
                collection(db, 'carts'),
                where('userEmail', '==', userEmail),
                where('reservedUntil', '>', now) // โหลดเฉพาะรายการที่ยังไม่หมดเวลา
            );

            const querySnapshot = await getDocs(q);
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ ...doc.data(), cartId: doc.id });
            });

            setCartItems(items);
        } catch (error) {
            console.error('Error loading cart items:', error);
        } finally {
            setLoadingCart(false);
        }
    };

    // เปิด/ปิดหน้าต่างรถเข็น
    const toggleCart = () => {
        if (!currentUser) {
            alert('กรุณาล็อกอินเพื่อใช้งานรถเข็น');
            return;
        }
        setIsCartOpen(!isCartOpen);
    };

    // เพิ่มสินค้าเข้าไปในรถเข็น
    const addToCart = async (product) => {
        if (!currentUser) {
            alert('กรุณาล็อกอินเพื่อเพิ่มสินค้าในรถเข็น');
            return;
        }

        const currentAmount = getCurrentAmount(product.id);
        if (currentAmount <= 0) {
            alert('สินค้าหมดสต็อก');
            return;
        }

        try {
            // คำนวณเวลาหมดอายุ (ปัจจุบัน + 15 นาที)
            const reservedUntil = new Date();
            reservedUntil.setMinutes(reservedUntil.getMinutes() + 15);

            const existingItem = cartItems.find(item => item.productId === product.id);

            if (existingItem) {
                const newQuantity = existingItem.quantity + 1;
                if (newQuantity > currentAmount) {
                    alert('ไม่สามารถเพิ่มจำนวนได้ เนื่องจากเกินจำนวนคงเหลือ');
                    return;
                }

                const cartDoc = doc(db, 'carts', existingItem.cartId);
                await updateDoc(cartDoc, {
                    quantity: newQuantity,
                    updatedAt: new Date(),
                    reservedUntil: reservedUntil
                });

                setCartItems(cartItems.map(item =>
                    item.cartId === existingItem.cartId
                        ? { ...item, quantity: newQuantity, amount: currentAmount, reservedUntil: reservedUntil }
                        : item
                ));
            } else {
                const docRef = await addDoc(collection(db, 'carts'), {
                    userEmail: currentUser.email,
                    productId: product.id,
                    productName: `สินค้า ${product.id}`,
                    quantity: 1,
                    imageUrl: product.imageUrl,
                    amount: currentAmount,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    reservedUntil: reservedUntil
                });

                setCartItems([...cartItems, {
                    cartId: docRef.id,
                    userEmail: currentUser.email,
                    productId: product.id,
                    productName: `สินค้า ${product.id}`,
                    quantity: 1,
                    imageUrl: product.imageUrl,
                    amount: currentAmount,
                    reservedUntil: reservedUntil
                }]);
            }

            alert('เพิ่มสินค้าในรถเข็นเรียบร้อยแล้ว (สินค้าจะถูกจองเป็นเวลา 15 นาที)');
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('เกิดข้อผิดพลาดในการเพิ่มสินค้าในรถเข็น: ' + error.message);
        }
    };

    /**
 * ลบสินค้าที่หมดสต็อก (จำนวน = 0) จาก Firestore และ state
 * @returns {Promise<void>}
 */
    const deleteOutOfStockProducts = async () => {
        try {
            // ดึงข้อมูลสินค้าทั้งหมดจาก Firestore
            const querySnapshot = await getDocs(collection(db, 'orders'));

            // กรองเฉพาะสินค้าที่หมดสต็อก
            const outOfStockProducts = querySnapshot.docs.filter(doc => {
                const amount = doc.data().amount;
                return amount === 0 || amount === '0';
            });

            // ถ้ามีสินค้าที่หมดสต็อก
            if (outOfStockProducts.length > 0) {
                // สร้าง Batch สำหรับลบหลายเอกสารพร้อมกัน
                const batch = writeBatch(db);

                // เตรียมรายการ ID ของสินค้าที่จะลบ
                const deletedProductIds = [];

                outOfStockProducts.forEach(doc => {
                    batch.delete(doc.ref);
                    deletedProductIds.push(doc.id);
                });

                // ดำเนินการลบ
                await batch.commit();
                console.log(`ลบสินค้าที่หมดสต็อกแล้ว ${deletedProductIds.length} รายการ`);

                // อัปเดตรายการสินค้าใน state โดยลบสินค้าที่ถูกลบออก
                setOrderList(prev => prev.filter(product =>
                    !deletedProductIds.includes(product.docId)
                ));

                // แจ้งเตือนผู้ใช้ (optional)
                if (deletedProductIds.length > 3) {
                    alert(`ระบบได้ทำการลบสินค้าที่หมดสต็อก ${deletedProductIds.length} รายการออกจากระบบแล้ว`);
                }
            }
        } catch (error) {
            console.error('Error deleting out of stock products:', error);
            throw error; // Throw error เพื่อให้ฟังก์ชันที่เรียกใช้สามารถจัดการต่อได้
        }
    };

    // ลบสินค้าออกจากรถเข็น
    const removeFromCart = async (cartId) => {
        try {
            // ลบจาก Firestore
            await deleteDoc(doc(db, 'carts', cartId));

            // อัปเดต state
            setCartItems(prevItems => prevItems.filter(item => item.cartId !== cartId));
        } catch (error) {
            console.error('Error removing from cart:', error);
            alert('เกิดข้อผิดพลาดในการลบสินค้าจากรถเข็น: ' + error.message);
        }
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const q = collection(db, 'orders');
                const unsubscribe = onSnapshot(q, (querySnapshot) => {
                    const orders = querySnapshot.docs.map((doc) => ({
                        docId: doc.id,
                        id: doc.data().id,
                        amount: doc.data().amount,
                        imageUrl: doc.data().imageUrl
                    }));
                    setOrderList(orders);

                    // ตรวจสอบและลบสินค้าที่หมดสต็อก
                    deleteOutOfStockProducts();
                });
                return () => unsubscribe();
            } catch (error) {
                console.error('Error fetching orders: ', error);
            }
        };

        fetchOrders();
    }, []);

    // ดึงข้อมูลรายการสินค้า
    useEffect(() => {
        const fetchOrders = () => {
            try {
                const q = collection(db, 'orders');
                const unsubscribe = onSnapshot(q, (querySnapshot) => {
                    const orders = querySnapshot.docs.map((doc) => ({
                        docId: doc.id,
                        id: doc.data().id,
                        amount: doc.data().amount,
                        imageUrl: doc.data().imageUrl
                    }));
                    setOrderList(orders);
                });

                return () => unsubscribe(); // Clean up subscription
            } catch (error) {
                console.error('Error fetching orders: ', error);
                alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
            }
        };

        fetchOrders();
    }, []);

    // เปิดฟอร์มเพิ่มสินค้า
    const handleOpenForm = () => {
        setIsFormOpen(true);
        setCurrentDocId(null); // รีเซ็ต Document ID เมื่อเพิ่มสินค้าใหม่
    };

    // ปิดฟอร์ม
    const handleCloseForm = () => {
        setIsFormOpen(false);
        setNewOrder({ id: '', amount: '', imageUrl: '' });
        setCurrentDocId(null);
        setShowDeleteConfirm(false);
    };

    // รับค่าจากฟอร์ม
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // ตรวจสอบฟิลด์ id ต้องเป็นตัวเลขเท่านั้น
        if (name === 'id') {
            if (!/^\d*$/.test(value)) return; // อนุญาตเฉพาะตัวเลข
            if (value.length > 6) return;     // ไม่เกิน 6 หลัก
        }

        setNewOrder({ ...newOrder, [name]: value });
    };

    // บันทึกข้อมูล
    const handleSaveOrder = async () => {
        try {
            // ตรวจสอบรหัสสินค้า 6 หลัก
            if (!newOrder.id || newOrder.id.length !== 6) {
                alert('กรุณากรอกรหัสสินค้า 6 หลัก');
                return;
            }

            // ตรวจสอบว่ามีสินค้าเลข ID นี้ในระบบแล้วหรือไม่ (เฉพาะกรณีเพิ่มใหม่)
            if (!currentDocId) {
                const q = query(collection(db, 'orders'), where('id', '==', newOrder.id));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    alert('มีสินค้าเลข ID นี้ในระบบแล้ว');
                    return;
                }
            }

            if (currentDocId) {
                // แก้ไขข้อมูลที่มีอยู่
                const orderDoc = doc(db, 'orders', currentDocId);
                await updateDoc(orderDoc, {
                    id: newOrder.id,
                    amount: newOrder.amount,
                    imageUrl: newOrder.imageUrl
                });
            } else {
                // เพิ่มข้อมูลใหม่
                await addDoc(collection(db, 'orders'), {
                    id: newOrder.id,
                    amount: newOrder.amount,
                    imageUrl: newOrder.imageUrl
                });
            }

            // ตรวจสอบและลบสินค้าที่หมดสต็อก (ถ้าจำนวนเป็น 0)
            if (parseInt(newOrder.amount) === 0) {
                try {
                    await deleteOutOfStockProducts();
                    alert('สินค้าถูกบันทึกและลบออกจากระบบเนื่องจากจำนวนเป็น 0');
                } catch (error) {
                    console.error('Error deleting out of stock product:', error);
                    alert('บันทึกสินค้าเรียบร้อย แต่เกิดข้อผิดพลาดในการลบสินค้าที่หมดสต็อก');
                }
            }

            handleCloseForm();
        } catch (error) {
            console.error('Error saving document: ', error);
            alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
        }
    };

    // เตรียมแก้ไขข้อมูล
    const handleEdit = (docId) => {
        if (!docId) {
            console.error('Document ID is missing');
            return;
        }
        const orderToEdit = orderList.find((order) => order.docId === docId);
        if (orderToEdit) {
            setNewOrder({
                id: orderToEdit.id,
                amount: orderToEdit.amount,
                imageUrl: orderToEdit.imageUrl
            });
            setCurrentDocId(docId);
            setIsFormOpen(true);  // เปิดฟอร์มแก้ไข
        }
    };

    // คลิกปุ่มลบ
    const handleDeleteClick = (docId) => {
        setCurrentDocId(docId);
        setShowDeleteConfirm(true);
    };

    // ยืนยันลบ
    const confirmDelete = async () => {
        if (!currentDocId) return;

        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'orders', currentDocId));

            // อัปเดตรายการโดยลบรายการที่ถูกลบออก
            setOrderList(orderList.filter(order => order.docId !== currentDocId));

            setShowDeleteConfirm(false);
            handleCloseForm();
        } catch (error) {
            console.error('Error deleting document: ', error);
            alert(`ลบข้อมูลไม่สำเร็จ: ${error.message}`);
        } finally {
            setIsDeleting(false);
            setCurrentDocId(null);
        }
    };

    // ยกเลิกการลบ
    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setCurrentDocId(null);
    };

    // ล้างข้อมูลทั้งหมด
    const handleClearAll = () => {
        if (orderList.length === 0) return;
        setShowClearConfirm(true);
    };

    // ยืนยันล้างข้อมูลทั้งหมด
    const confirmClearAll = async () => {
        setIsDeleting(true);
        try {
            const batch = writeBatch(db);
            const querySnapshot = await getDocs(collection(db, 'orders'));

            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            setOrderList([]);
        } catch (error) {
            console.error('Error clearing all orders: ', error);
            alert('เกิดข้อผิดพลาดในการลบทั้งหมด: ' + error.message);
        } finally {
            setIsDeleting(false);
            setShowClearConfirm(false);
        }
    };

    // ยกเลิกล้างข้อมูลทั้งหมด
    const cancelClearAll = () => {
        setShowClearConfirm(false);
    };

    // Animation
    useEffect(() => {
        const interval = setInterval(() => {
            if (h3Ref.current) {
                h3Ref.current.classList.add('animate__animated', 'animate__heartBeat');
                setTimeout(() => {
                    h3Ref.current.classList.remove('animate__animated', 'animate__heartBeat');
                }, 1000);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    // Toggle show all/some products
    const toggleShowAll = () => {
        setShowAllProducts(!showAllProducts);
    };

    // Calculate products to display
    const displayedProducts = showAllProducts ? orderList : orderList.slice(0, displayCount);

    // เพิ่ม state สำหรับหน้าต่างค้นหา
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchInputs, setSearchInputs] = useState(['', '', '', '', '', '']);
    const [searchResult, setSearchResult] = useState(null);

    // เปิดหน้าต่างค้นหา
    const handleOpenSearch = () => {
        setIsSearchOpen(true);
        setSearchInputs(['', '', '', '', '', '']);
        setSearchResult(null);
    };

    // ปิดหน้าต่างค้นหา
    const handleCloseSearch = () => {
        setIsSearchOpen(false);
    };

    // รับค่าจาก input การค้นหา
    const handleSearchInputChange = (index, value) => {
        // อนุญาตเฉพาะตัวเลข 0-9 และความยาวไม่เกิน 1 ตัวอักษร
        if (!/^[0-9]?$/.test(value)) return;

        const newInputs = [...searchInputs];
        newInputs[index] = value;
        setSearchInputs(newInputs);

        // ย้ายโฟกัสไปยัง input ถัดไปเมื่อกรอกข้อมูล
        if (value && index < 5) {
            const nextInput = document.getElementById(`search-input-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    // ฟังก์ชันค้นหาสินค้า
    const handleSearchProduct = async () => {
        const productId = searchInputs.join('');
        if (productId.length !== 6) {
            alert('กรุณากรอกรหัสสินค้า 6 หลักให้ครบถ้วน');
            return;
        }

        try {
            const q = query(collection(db, 'orders'), where('id', '==', productId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setSearchResult({ found: false });
            } else {
                const doc = querySnapshot.docs[0];
                setSearchResult({
                    found: true,
                    product: {
                        docId: doc.id,  // เพิ่ม docId จาก Firebase
                        id: doc.data().id,
                        amount: doc.data().amount,
                        imageUrl: doc.data().imageUrl
                    }
                });
            }
        } catch (error) {
            console.error('Error searching product: ', error);
            alert('เกิดข้อผิดพลาดในการค้นหา: ' + error.message);
        }
    };

    const handleRandomProduct = async () => {
        try {
            if (orderList.length === 0) {
                alert('ไม่มีสินค้าในระบบ');
                return;
            }

            // สุ่มเลือกสินค้าจาก orderList
            const randomIndex = Math.floor(Math.random() * orderList.length);
            const randomProduct = orderList[randomIndex];

            // แสดงผลลัพธ์การสุ่ม
            setSearchResult({
                found: true,
                product: {
                    docId: randomProduct.docId,
                    id: randomProduct.id,
                    amount: randomProduct.amount,
                    imageUrl: randomProduct.imageUrl
                }
            });

        } catch (error) {
            console.error('Error getting random product: ', error);
            alert('เกิดข้อผิดพลาดในการสุ่มสินค้า: ' + error.message);
        }
    };

    const updateCartItemQuantity = async (cartId, newQuantity) => {
        if (newQuantity < 1) return;

        const cartItem = cartItems.find(item => item.cartId === cartId);
        if (!cartItem) return;

        const currentAmount = getCurrentAmount(cartItem.productId);

        if (newQuantity > currentAmount) {
            alert('ไม่สามารถเพิ่มจำนวนได้ เนื่องจากเกินจำนวนคงเหลือ');
            return;
        }

        try {
            const cartDoc = doc(db, 'carts', cartId);
            await updateDoc(cartDoc, {
                quantity: newQuantity,
                updatedAt: new Date(),
                amount: currentAmount // อัปเดต amount ด้วย
            });

            setCartItems(cartItems.map(item =>
                item.cartId === cartId
                    ? { ...item, quantity: newQuantity, amount: currentAmount }
                    : item
            ));
        } catch (error) {
            console.error('Error updating cart item quantity:', error);
            alert('เกิดข้อผิดพลาดในการอัปเดตจำนวนสินค้า: ' + error.message);
        }
    };

    const getCurrentAmount = (productId) => {
        const product = orderList.find(order => order.id === productId);
        return product ? product.amount : 0;
    };

    const checkReservedItems = async () => {
        try {
            const now = new Date();
            const q = query(collection(db, 'carts'),
                where('userEmail', '==', currentUser?.email),
                where('reservedUntil', '<=', now));

            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);

            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();

            // อัปเดต state ถ้ามีการลบรายการ
            if (!querySnapshot.empty) {
                setCartItems(cartItems.filter(item =>
                    item.reservedUntil > now
                ));
            }
        } catch (error) {
            console.error('Error checking reserved items:', error);
        }
    };

    // เรียกฟังก์ชันทุก 1 นาที
    useEffect(() => {
        const interval = setInterval(() => {
            if (currentUser) {
                checkReservedItems();
            }
        }, 60000); // ตรวจสอบทุก 1 นาที

        return () => clearInterval(interval);
    }, [currentUser, cartItems]);

    useEffect(() => {
        if (cartItems.length > 0) {
            const now = new Date();
            const expiredItems = cartItems.filter(item => item.reservedUntil <= now);

            if (expiredItems.length > 0) {
                const batch = writeBatch(db);
                expiredItems.forEach(item => {
                    batch.delete(doc(db, 'carts', item.cartId));
                });

                batch.commit()
                    .then(() => {
                        setCartItems(prev => prev.filter(item => item.reservedUntil > now));
                    })
                    .catch(error => {
                        console.error('Error removing expired items:', error);
                    });
            }
        }
    }, [cartItems]);

    const isProductInCart = (productId) => {
        return cartItems.some(item => item.productId === productId);
    };

    const CountdownTimer = ({ endTime, cartId, removeFromCart }) => {
        const calculateRemainingTime = () => {
            return Math.max(0, Math.floor((endTime - new Date()) / 1000));
        };

        const [remainingTime, setRemainingTime] = useState(calculateRemainingTime());

        useEffect(() => {
            const interval = setInterval(() => {
                const newRemaining = calculateRemainingTime();
                setRemainingTime(newRemaining);

                if (newRemaining <= 0) {
                    clearInterval(interval);
                    removeFromCart(cartId); // เรียกฟังก์ชันลบสินค้าเมื่อเวลาหมด
                }
            }, 1000);

            return () => clearInterval(interval);
        }, [endTime, cartId, removeFromCart]);

        // ตรวจสอบว่าเวลาเหลือ 0 หรือไม่
        if (remainingTime <= 0) {
            return (
                <span className={`${styles.timer} ${styles.expired}`}>
                    00:00
                </span>
            );
        }

        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const isWarning = remainingTime < 60;
        const isCritical = remainingTime < 10;

        return (
            <span className={`
            ${styles.timer} 
            ${isWarning ? styles.warning : ''} 
            ${isCritical ? styles.critical : ''}
          `}>
                {formattedTime}
            </span>
        );
    };

    // เพิ่ม state ที่ด้านบนของคอมโพเนนต์
    const [usePromptPay, setUsePromptPay] = useState(false);

    const handleCheckout = async () => {
        setIsProcessing(true);

        // ตรวจสอบข้อมูลพื้นฐาน
        if (!currentUser) {
            alert('กรุณาล็อกอินก่อนทำการสั่งซื้อ');
            setIsProcessing(false);
            return;
        }

        if (cartItems.length === 0) {
            alert('ไม่มีสินค้าในรถเข็น');
            setIsProcessing(false);
            return;
        }

        if (!usePromptPay) {
            alert('กรุณาเลือกวิธีการชำระเงินผ่าน PromptPay');
            setIsProcessing(false);
            return;
        }

        // ตรวจสอบข้อมูลจัดส่งสำหรับแบบต่างประเทศ
        if (shippingMethod === 'international' &&
            (!internationalAddress || !recipientName || !recipientPhone)) {
            alert('กรุณากรอกข้อมูลการจัดส่งให้ครบถ้วน');
            setIsProcessing(false);
            return;
        }

        // ตรวจสอบข้อมูลการชำระเงิน
        if (usePromptPay && (
            !paymentData.accountNumber ||
            !paymentData.accountName ||
            !paymentData.paymentDate ||
            !paymentData.paymentTime
        )) {
            alert('กรุณากรอกข้อมูลการชำระเงินให้ครบถ้วน');
            setIsProcessing(false);
            return;
        }

        try {
            // 1. เตรียมข้อมูลคำสั่งซื้อ
            const productIds = cartItems.map(item => item.productId).join(', ');
            const now = new Date();

            const orderData = {
                userEmail: currentUser.email,
                productIds: productIds,
                totalItems: totalItems,
                productPrice: totalProductPrice,
                shippingCost: shippingCost,
                totalPrice: totalPrice,
                paymentMethod: 'PromptPay',
                paymentDetails: {
                    accountNumber: paymentData.accountNumber,
                    accountName: paymentData.accountName,
                    paymentDate: paymentData.paymentDate,
                    paymentTime: paymentData.paymentTime,
                    verified: 'pending' // 'pending', 'approved', 'rejected'
                },
                createdAt: now,
                updatedAt: now,
                status: 'pending',
                items: cartItems.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    price: 80,
                    imageUrl: item.imageUrl
                }))
            };

            // 2. บันทึกข้อมูลตามวิธีการจัดส่ง
            if (shippingMethod === 'domestic') {
                await addDoc(collection(db, 'requests'), orderData);
            } else {
                await addDoc(collection(db, 'request_address'), {
                    ...orderData,
                    recipientName: recipientName,
                    recipientPhone: recipientPhone,
                    shippingAddress: internationalAddress
                });
            }

            // 3. อัปเดตจำนวนสินค้าในสต็อก
            const batch = writeBatch(db);
            for (const item of cartItems) {
                const q = query(collection(db, 'orders'), where('id', '==', item.productId));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const productDoc = querySnapshot.docs[0];
                    const currentAmount = productDoc.data().amount;
                    const newAmount = currentAmount - item.quantity;

                    if (newAmount < 0) {
                        throw new Error(`สินค้า ${item.productId} มีจำนวนไม่เพียงพอ`);
                    }

                    batch.update(productDoc.ref, { amount: newAmount });
                }
            }
            await batch.commit();

            // 4. ลบสินค้าในรถเข็น
            const cartBatch = writeBatch(db);
            cartItems.forEach(item => {
                const cartRef = doc(db, 'carts', item.cartId);
                cartBatch.delete(cartRef);
            });
            await cartBatch.commit();

            // 5. รีเซ็ตข้อมูล
            setCartItems([]);
            setRecipientName('');
            setRecipientPhone('');
            setInternationalAddress('');
            setUsePromptPay(false);
            setPaymentData({
                accountNumber: '',
                accountName: '',
                paymentDate: '',
                paymentTime: ''
            });

            alert('สั่งซื้อสำเร็จ! ระบบจะทำการตรวจสอบการชำระเงินของท่าน');

        } catch (error) {
            console.error('Error during checkout:', error);
            alert(`เกิดข้อผิดพลาดในการสั่งซื้อ: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const clearAllCollections = async () => {
        const confirm = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบคำสั่งซื้อทั้งหมด?");
        if (!confirm) return;

        const collectionsToClear = ["requests", "request_address"];

        try {
            for (const colName of collectionsToClear) {
                const querySnapshot = await getDocs(collection(db, colName));
                const deletePromises = querySnapshot.docs.map(docItem =>
                    deleteDoc(doc(db, colName, docItem.id))
                );
                await Promise.all(deletePromises);
            }
            alert("ลบคำสั่งซื้อทั้งหมดจากทั้ง 2 คอลเลกชันเรียบร้อยแล้ว");
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการลบ:", error);
            alert("เกิดข้อผิดพลาดในการลบคำสั่งซื้อ");
        }
    };

    const clearFilteredOrders = async () => {
        if (!searchQuery.trim()) {
            alert("กรุณากรอกคำค้นหาก่อนลบรายการ");
            return;
        }

        const confirm = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเฉพาะคำสั่งซื้อที่ค้นหา?");
        if (!confirm) return;

        const collectionsToClear = ["requests", "request_address"];

        try {
            for (const colName of collectionsToClear) {
                const querySnapshot = await getDocs(collection(db, colName));
                const deletePromises = querySnapshot.docs
                    .filter(docItem => {
                        const data = docItem.data();
                        if (searchType === 'orderId') {
                            return data.id?.toLowerCase().includes(searchQuery.toLowerCase());
                        } else if (searchType === 'productId') {
                            return data.productIds?.toLowerCase().includes(searchQuery.toLowerCase());
                        }
                        return false;
                    })
                    .map(docItem =>
                        deleteDoc(doc(db, colName, docItem.id))
                    );
                await Promise.all(deletePromises);
            }

            alert("ลบรายการที่ค้นหาสำเร็จแล้ว");
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการลบ:", error);
            alert("เกิดข้อผิดพลาดในการลบรายการที่ค้นหา");
        }
    };

    return (
        <div className={styles.order_con}>
            <div className={styles.title_con}>
                <h1>รายการสินค้า</h1>
                <div className={styles.btn_order}>
                    <button
                        onClick={toggleShowAll}
                        className={styles.toggle_button}
                        disabled={orderList.length <= displayCount}
                    >
                        {showAllProducts ? <FaEye /> : <FaEyeLowVision />}
                    </button>
                    
                    <button
                        className={styles.list_check}
                        onClick={toggleOrderList}
                    >
                        <FaListCheck />
                    </button>
                    <button
                        className={styles.sistrix}
                        onClick={handleOpenSearch}
                    >
                        <FaSistrix />
                    </button>
                    <button
                        onClick={handleClearAll}
                        disabled={orderList.length === 0 || isDeleting}
                        className={styles.clear_button}
                    >
                        <FaTrash />
                    </button>
                    <button
                        onClick={handleOpenForm}
                        disabled={isDeleting}
                        className={styles.add_button}
                    >
                        <FaPlus />
                    </button>
                </div>
            </div>

            {/* รายการสินค้า */}
            <div className={styles.order_list}>
                {displayedProducts
                    .filter(order => !isProductInCart(order.id)) // กรองสินค้าที่อยู่ในรถเข็นออก
                    .map((order) => {
                        const currentAmount = getCurrentAmount(order.id);
                        return (
                            <div key={order.docId} className={styles.order_items}>
                                <div className={styles.order_info}>
                                    <p className={styles.product_id}>รหัสสินค้า: {order.id}</p>
                                    <p>จำนวน: {currentAmount}</p>
                                </div>
                                <div className={styles.order_img}>
                                    {order.imageUrl && (
                                        <img src={order.imageUrl} alt={`สินค้า ${order.id}`} />
                                    )}
                                </div>
                                <div className={styles.order_actions}>
                                    <button
                                        className={styles.edit_button}
                                        onClick={() => handleEdit(order.docId)}
                                        disabled={isDeleting}
                                    >
                                        <FaPenToSquare />
                                    </button>
                                    <button
                                        className={styles.delete_button}
                                        onClick={() => handleDeleteClick(order.docId)}
                                        disabled={isDeleting}
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* หน้าต่างรถเข็น */}
            {isCartOpen && (
                <div className={styles.cart_overlay}>
                    <div className={styles.cart_modal}>
                        <div className={styles.cart_header}>
                            <h2>รถเข็นของฉัน</h2>
                            <button
                                onClick={toggleCart}
                                className={styles.close_cart_button}
                            >
                                <FaXmark />
                            </button>
                        </div>

                        {loadingCart ? (
                            <p>กำลังโหลดข้อมูลรถเข็น...</p>
                        ) : cartItems.length === 0 ? (
                            <p className={styles.empty_cart}>รถเข็นว่างเปล่า</p>
                        ) : (
                            <>
                                <div className={styles.cart_items}>
                                    {cartItems.map((item) => {
                                        const currentAmount = getCurrentAmount(item.productId);
                                        const itemPrice = 80; // ราคาสินค้าต่อชิ้น
                                        const shippingPerItem = 25; // ค่าบริการต่อชิ้น
                                        const itemTotal = (itemPrice + shippingPerItem) * item.quantity;

                                        return (
                                            <div key={item.cartId} className={styles.cart_item}>
                                                <div className={styles.cart_item_image}>
                                                    {item.imageUrl && (
                                                        <img src={item.imageUrl} alt={item.productName} />
                                                    )}
                                                </div>
                                                <div className={styles.cart_item_info}>
                                                    <h3>{item.productName}</h3>
                                                    {/* ส่วนแสดงเวลานับถอยหลัง */}
                                                    <div className={styles.timer_container}>

                                                        <p className={styles.stock_info}>จำนวนคงเหลือ: {currentAmount}</p>
                                                        <CountdownTimer
                                                            endTime={item.reservedUntil}
                                                            cartId={item.cartId}
                                                            removeFromCart={removeFromCart}
                                                        />
                                                    </div>

                                                    <div className={styles.quantity_control}>
                                                        <button
                                                            onClick={() => updateCartItemQuantity(item.cartId, item.quantity - 1)}
                                                            disabled={item.quantity <= 1}
                                                            className={styles.quantity_button}
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => {
                                                                const newQuantity = parseInt(e.target.value) || 1;
                                                                if (newQuantity >= 1 && newQuantity <= currentAmount) {
                                                                    updateCartItemQuantity(item.cartId, newQuantity);
                                                                }
                                                            }}
                                                            min="1"
                                                            max={currentAmount}
                                                            className={styles.quantity_input}
                                                        />
                                                        <button
                                                            onClick={() => updateCartItemQuantity(item.cartId, item.quantity + 1)}
                                                            disabled={item.quantity >= currentAmount}
                                                            className={styles.quantity_button}
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                </div>
                                                <div className={styles.cart_item_actions}>
                                                    <button
                                                        onClick={() => removeFromCart(item.cartId)}
                                                        className={styles.remove_cart_button}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ส่วนเลือกวิธีการจัดส่ง */}
                                <div className={styles.shipping_section}>
                                    <h3>บริการ</h3>
                                    <div className={styles.shipping_options}>
                                        <label>
                                            <input
                                                type="radio"
                                                name="shipping"
                                                value="domestic"
                                                checked={shippingMethod === 'domestic'}
                                                onChange={() => setShippingMethod('domestic')}
                                            />
                                            <span>ระบบดูแลให้ (25 บาท/ใบ)</span>
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="shipping"
                                                value="international"
                                                checked={shippingMethod === 'international'}
                                                onChange={() => setShippingMethod('international')}
                                            />
                                            <span>จัดส่งตามที่อยู่ (50 บาท/ใบ)</span>
                                        </label>
                                    </div>

                                    {/* ฟิลด์ที่อยู่สำหรับจัดส่งต่างประเทศ */}
                                    {shippingMethod === 'international' && (
                                        <div className={styles.address_section}>
                                            <h3>ที่อยู่จัดส่งต่างประเทศ</h3>

                                            {/* ชื่อ-นามสกุล */}
                                            <div className={styles.form_group}>
                                                <input
                                                    type="text"
                                                    value={recipientName}
                                                    onChange={(e) => setRecipientName(e.target.value)}
                                                    placeholder="ชื่อ-นามสกุลผู้รับ"
                                                    required
                                                />
                                            </div>

                                            {/* เบอร์โทรศัพท์ */}
                                            <div className={styles.form_group}>
                                                <input
                                                    type="tel"
                                                    value={recipientPhone}
                                                    onChange={(e) => setRecipientPhone(e.target.value)}
                                                    placeholder="เบอร์โทรศัพท์ผู้รับ"
                                                    required
                                                    pattern="[0-9]{10}"
                                                    title="กรุณากรอกเบอร์โทรศัพท์ 10 หลัก"
                                                />
                                            </div>

                                            {/* ที่อยู่ */}
                                            <div className={styles.form_group}>
                                                <textarea
                                                    value={internationalAddress}
                                                    onChange={(e) => setInternationalAddress(e.target.value)}
                                                    placeholder="ที่อยู่จัดส่ง"
                                                    rows={4}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.cart_summary}>
                                    <div className={styles.summary_row}>
                                        <span>จำนวนสินค้า:</span>
                                        <span>{totalItems} ชิ้น</span>
                                    </div>
                                    <div className={styles.summary_row}>
                                        <span>รวมค่าสินค้า:</span>
                                        <span>{totalProductPrice} บาท</span>
                                    </div>
                                    <div className={styles.summary_row}>
                                        <span>ค่าบริการ:</span>
                                        <span>{shippingCost} บาท</span>
                                    </div>
                                    <div className={styles.summary_row_total}>
                                        <span>ยอดรวมทั้งหมด:</span>
                                        <span>{totalPrice} บาท</span>
                                    </div>

                                    {/* ส่วนเลือกวิธีการชำระเงิน */}
                                    <div className={styles.payment_method}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={usePromptPay}
                                                onChange={(e) => setUsePromptPay(e.target.checked)}
                                            />
                                            <span>ชำระผ่าน PromptPay</span>
                                        </label>
                                    </div>

                                    {usePromptPay && (
                                        <div className={styles.promptpay_section}>
                                            <div className={styles.qr_code_container}>
                                                <img
                                                    src="/promptpay-qr.png"
                                                    alt="QR Code PromptPay"
                                                    className={styles.qr_code}
                                                />
                                            </div>

                                            <div className={styles.payment_details}>
                                                <div className={styles.form_group}>
                                                    <label>เลขบัญชีผู้ชำระ</label>
                                                    <input
                                                        type="text"
                                                        value={paymentData.accountNumber}
                                                        onChange={(e) => setPaymentData({ ...paymentData, accountNumber: e.target.value })}
                                                        placeholder="เช่น 1234567890"
                                                        required
                                                    />
                                                </div>

                                                <div className={styles.form_group}>
                                                    <label>ชื่อบัญชีผู้ชำระ</label>
                                                    <input
                                                        type="text"
                                                        value={paymentData.accountName}
                                                        onChange={(e) => setPaymentData({ ...paymentData, accountName: e.target.value })}
                                                        placeholder="เช่น สมชาย ใจดี"
                                                        required
                                                    />
                                                </div>

                                                <div className={styles.form_row}>
                                                    <div className={styles.form_group}>
                                                        <label>วันที่ชำระ</label>
                                                        <input
                                                            type="text"
                                                            value={paymentData.paymentDate}
                                                            onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                                                            placeholder="เช่น 07 เม.ย. 68"
                                                            required
                                                        />
                                                    </div>

                                                    <div className={styles.form_group}>
                                                        <label>เวลาที่ชำระ</label>
                                                        <input
                                                            type="text"
                                                            value={paymentData.paymentTime}
                                                            onChange={(e) => setPaymentData({ ...paymentData, paymentTime: e.target.value })}
                                                            placeholder="เช่น 14:06"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ปุ่มชำระเงิน */}
                                    <button
                                        className={styles.checkout_button}
                                        disabled={
                                            (shippingMethod === 'international' &&
                                                (!internationalAddress || !recipientName || !recipientPhone)) ||
                                            !usePromptPay ||
                                            isProcessing ||
                                            cartItems.length === 0 ||
                                            (usePromptPay && (
                                                !paymentData.accountNumber ||
                                                !paymentData.accountName ||
                                                !paymentData.paymentDate ||
                                                !paymentData.paymentTime
                                            ))
                                        }
                                        onClick={handleCheckout}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <span className={styles.spinner}></span>
                                                กำลังประมวลผล...
                                            </>
                                        ) : (
                                            'ชำระเงิน'
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ฟอร์มเพิ่ม/แก้ไขข้อมูล */}
            {isFormOpen && (
                <div className={styles.form_overlay}>
                    <div className={styles.order_form}>
                        <h2>{currentDocId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>

                        <div className={styles.form_group}>
                            <label>รหัสสินค้า (6 หลัก):</label>
                            <input
                                type="text"
                                name="id"
                                value={newOrder.id}
                                onChange={handleInputChange}
                                maxLength={6}
                                pattern="\d{6}"
                                title="กรุณากรอกตัวเลข 6 หลัก"
                                disabled={!!currentDocId}
                                required
                            />
                        </div>

                        <div className={styles.form_group}>
                            <label>จำนวน:</label>
                            <input
                                type="text"  // เปลี่ยนจาก type="number" เป็น type="text" เพื่อควบคุมการป้อนข้อมูลเอง
                                name="amount"
                                value={newOrder.amount}
                                onChange={handleInputChange}
                                onKeyPress={(e) => {
                                    // อนุญาตเฉพาะการกดปุ่มตัวเลข (0-9)
                                    if (!/[0-9]/.test(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                                min="1"
                                required
                                inputMode="numeric" // แสดงคีย์บอร์ดตัวเลขบนอุปกรณ์มือถือ
                                pattern="[0-9]*"   // สำหรับเบราว์เซอร์บางตัวที่สนับสนุน

                            />
                        </div>

                        <div className={styles.form_group}>
                            <label>ลิงก์รูปภาพ:</label>
                            <input
                                type="url"
                                name="imageUrl"
                                value={newOrder.imageUrl}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className={styles.form_buttons}>
                            {currentDocId && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteClick(currentDocId)}
                                    className={styles.delete_button}
                                    disabled={isDeleting}
                                >
                                    ลบสินค้า
                                </button>
                            )}
                            <button
                                onClick={handleSaveOrder}
                                disabled={!newOrder.id || newOrder.id.length !== 6 || !newOrder.amount || !newOrder.imageUrl || isDeleting}
                                className={styles.save_button}
                            >
                                {currentDocId ? 'บันทึกการแก้ไข' : 'บันทึก'}
                            </button>
                            <button
                                onClick={handleCloseForm}
                                disabled={isDeleting}
                                className={styles.cancel_button}
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {orderList.map((order) => {
                // ไม่แสดงสินค้าที่จำนวนเป็น 0 (ถ้ายังไม่ถูกลบจากฐานข้อมูล)
                if (order.amount === 0 || order.amount === '0') {
                    return null;
                }

                return (
                    <div key={order.docId} className={styles.order_items}>
                        {/* ... โค้ดแสดงผลสินค้า ... */}
                    </div>
                );
            })}

            {/* หน้าต่างคำสั่งซื้อทั้งหมด */}
            {isOrderListOpen && (
                <div className={styles.order_list_overlay}>
                    <div className={styles.order_list_modal}>
                        <div className={styles.order_list_header}>
                            <h2>คำสั่งซื้อทั้งหมด</h2>
                            <button
                                onClick={toggleOrderList}
                                className={styles.close_button}
                            >
                                <FaXmark />
                            </button>
                        </div>
                        <div className={styles.search_section}>
                            <input
                                type="text"
                                placeholder="ค้นหา..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.search_input}
                            />
                            <select
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value)}
                                className={styles.search_select}
                            >
                                <option value="orderId">คำสั่งซื้อ</option>
                                <option value="productId">รหัสสินค้า</option>
                            </select>
                            <button
                                onClick={clearFilteredOrders}
                                className={styles.clear_button}
                                title="ลบเฉพาะรายการที่ค้นหา"
                            >
                                <FaMinus style={{ color: 'white' }} /> {/* เพิ่มสีก็ได้ เพื่อแยกจากปุ่มเดิม */}
                            </button>

                            <button
                                onClick={clearAllCollections}
                                className={styles.clear_button}
                            >
                                <FaTrash />
                            </button>

                        </div>

                        <ul className={styles.request_status}>
                            <li className={styles.check}><FaCircleCheck /> อนุมัติคำสั่งซื้อจะเป็นสีเขียว</li>
                            <li className={styles.reject}><FaCircleXmark /> ไม่อนุมัติคำสั่งซื้อจะเป็นสีแดง</li>
                            <li className={styles.clock}><FaClock /> กำลังตรวจสอบคำสั่งซื้อจะเป็นสีดำ</li>
                        </ul>
                        {/* Tab เมนู */}
                        <div className={styles.order_list_tabs}>
                            <button
                                className={activeTab === 'all' ? styles.active_tab : ''}
                                onClick={() => setActiveTab('all')}
                            >
                                ทั้งหมด
                            </button>
                            <button
                                className={activeTab === 'domestic' ? styles.active_tab : ''}
                                onClick={() => setActiveTab('domestic')}
                            >
                                ระบบดูแลให้
                            </button>
                            <button
                                className={activeTab === 'international' ? styles.active_tab : ''}
                                onClick={() => setActiveTab('international')}
                            >
                                จัดส่งตามที่อยู่
                            </button>
                        </div>

                        {loadingOrders ? (
                            <div className={styles.loading_container}>
                                <p>กำลังโหลดข้อมูล...</p>
                            </div>
                        ) : (
                            <div className={styles.orders_container}>
                                {allOrders
                                    .filter(order =>
                                        (activeTab === 'all' ||
                                            (activeTab === 'domestic' && order.type === 'domestic') ||
                                            (activeTab === 'international' && order.type === 'international')) &&
                                        (
                                            searchQuery === '' || (
                                                searchType === 'orderId'
                                                    ? order.id.toLowerCase().includes(searchQuery.toLowerCase())
                                                    : order.productIds.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                        )
                                    )
                                    .sort((a, b) => b.createdAt - a.createdAt)
                                    .map(order => (
                                        <div key={order.id} className={styles.order_item}>
                                            <div className={styles.order_header}>
                                                <h3
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setShowActionDialog(true);
                                                    }}
                                                    className={styles.clickable_title}
                                                    style={{
                                                        color: order.status === 'approved' ? '#4CAF50' :
                                                            order.status === 'rejected' ? '#F44336' : 'inherit'
                                                    }}
                                                >
                                                    คำสั่งซื้อ #{order.id.slice(0, 8)}
                                                </h3>
                                                <span className={order.type === 'domestic' ? styles.domestic_badge : styles.international_badge}>
                                                    {order.type === 'domestic' ? 'ระบบดูแลให้' : 'จัดส่งตามที่อยู่'}
                                                </span>
                                            </div>

                                            <div className={styles.order_body}>
                                                <p><strong>อีเมล:</strong> {order.userEmail}</p>
                                                <p><strong>รหัสสินค้า:</strong> {order.productIds}</p>
                                                <p><strong></strong> {order.serviceType}</p>

                                                {order.type === 'international' && (
                                                    <>
                                                        <p><strong>ชื่อผู้รับ:</strong> {order.recipientName}</p>
                                                        <p><strong>เบอร์โทร:</strong> {order.recipientPhone}</p>
                                                        <p><strong>ที่อยู่:</strong> {order.shippingAddress}</p>
                                                    </>
                                                )}

                                                <div className={styles.order_summary}>
                                                    <p><strong>จำนวนสินค้า:</strong> {order.totalItems} ชิ้น</p>
                                                    <p><strong>รวมค่าสินค้า:</strong> {order.productPrice} บาท</p>
                                                    <p><strong>ค่าจัดส่ง:</strong> {order.shippingCost} บาท</p>
                                                    <p><strong>ยอดรวมทั้งหมด:</strong> {order.totalPrice} บาท</p>
                                                </div>

                                                <div className={styles.payment_info}>
                                                    <h4>ข้อมูลการชำระเงิน</h4>
                                                    <p><strong>วิธีการ:</strong> {order.paymentMethod}</p>

                                                    {order.paymentMethod === 'PromptPay' && order.paymentDetails && (
                                                        <div className={styles.payment_details_grid}>
                                                            <div>
                                                                <p><strong>เลขบัญชี:</strong></p>
                                                                <p>{order.paymentDetails.accountNumber}</p>
                                                            </div>
                                                            <div>
                                                                <p><strong>ชื่อบัญชี:</strong></p>
                                                                <p>{order.paymentDetails.accountName}</p>
                                                            </div>
                                                            <div>
                                                                <p><strong>วันที่ชำระ:</strong></p>
                                                                <p>{order.paymentDetails.paymentDate}</p>
                                                            </div>
                                                            <div>
                                                                <p><strong>เวลาชำระ:</strong></p>
                                                                <p>{order.paymentDetails.paymentTime}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <p className={styles.order_date}>
                                                    {order.createdAt.toDate().toLocaleString('th-TH', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                }

                                {allOrders.length === 0 && (
                                    <div className={styles.no_orders}>
                                        <p>ไม่พบคำสั่งซื้อ</p>
                                    </div>
                                )}
                            </div>

                        )}
                    </div>
                </div>
            )}

            {showActionDialog && selectedOrder && (
                <div className={styles.dialog_overlay}>
                    <div className={styles.action_dialog}>
                        <h3>คุณต้องการทำอะไรกับคำสั่งซื้อนี้?</h3>
                        <p>คำสั่งซื้อ #{selectedOrder.id.slice(0, 8)}</p>

                        <div className={styles.dialog_buttons}>
                            <button
                                onClick={async () => {
                                    await updateOrderStatus(selectedOrder.id, 'approved');
                                    setShowActionDialog(false);
                                }}
                                className={styles.approve_button}
                            >
                                อนุมัติ
                            </button>
                            <button
                                onClick={async () => {
                                    await updateOrderStatus(selectedOrder.id, 'rejected');
                                    setShowActionDialog(false);
                                }}
                                className={styles.reject_button}
                            >
                                ไม่อนุมัติ
                            </button>
                            <button
                                onClick={() => setShowActionDialog(false)}
                                className={styles.cancel_button}
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* หน้าต่างยืนยันการลบ */}
            {showDeleteConfirm && (
                <div className={styles.confirm_overlay}>
                    <div className={styles.confirm_dialog}>
                        <h3>ยืนยันการลบสินค้า</h3>
                        <p>คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้? การกระทำนี้ไม่สามารถยกเลิกได้</p>
                        <div className={styles.confirm_buttons}>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className={styles.confirm_delete_button}
                            >
                                {isDeleting ? 'กำลังลบ...' : <> ยืนยันลบ</>}
                            </button>
                            <button
                                onClick={cancelDelete}
                                disabled={isDeleting}
                                className={styles.cancel_button}
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* หน้าต่างยืนยันการล้างทั้งหมด */}
            {showClearConfirm && (
                <div className={styles.confirm_overlay}>
                    <div className={styles.confirm_dialog}>
                        <h3>ยืนยันการล้างข้อมูลทั้งหมด</h3>
                        <p>คุณแน่ใจหรือไม่ว่าต้องการลบทุกรายการ? การกระทำนี้ไม่สามารถยกเลิกได้</p>
                        <div className={styles.confirm_buttons}>
                            <button
                                onClick={confirmClearAll}
                                disabled={isDeleting}
                                className={styles.confirm_delete_button}
                            >
                                {isDeleting ? 'กำลังลบ...' : <> ยืนยันลบทั้งหมด</>}
                            </button>
                            <button
                                onClick={cancelClearAll}
                                disabled={isDeleting}
                                className={styles.cancel_button}
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* หน้าต่างค้นหาสินค้า */}
            {isSearchOpen && (
                <div className={styles.form_overlay}>
                    <div className={styles.search_form}>
                        <h2>ค้นหาสินค้า</h2>

                        <div className={styles.search_inputs_container}>
                            <p className={styles.search_instruction}>กรุณากรอกรหัสสินค้า 6 หลัก</p>
                            <div className={styles.search_inputs}>
                                {searchInputs.map((value, index) => (
                                    <input
                                        key={index}
                                        id={`search-input-${index}`}
                                        type="text"
                                        value={value}
                                        onChange={(e) => handleSearchInputChange(index, e.target.value)}
                                        maxLength={1}
                                        pattern="[0-9]"
                                        inputMode="numeric"
                                        autoFocus={index === 0}
                                        className={styles.search_input}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className={styles.search_actions}>
                            <button
                                onClick={handleSearchProduct}
                                className={styles.search_button}
                            >
                                ค้นหา
                            </button>

                            <button
                                onClick={handleRandomProduct}
                                className={styles.random_button}
                            >
                                สุ่มสินค้า
                            </button>

                            <button
                                onClick={handleCloseSearch}
                                className={styles.close_search_button}
                            >
                                ปิด
                            </button>
                        </div>

                        {searchResult && (
                            <div className={styles.search_result}>
                                {searchResult.found ? (
                                    <div className={styles.product_found}>
                                        <h3>พบสินค้า</h3>
                                        <p><strong>รหัสสินค้า:</strong> {searchResult.product.id}</p>
                                        <p><strong>จำนวน:</strong> {searchResult.product.amount}</p>
                                        {searchResult.product.imageUrl && (
                                            <img
                                                src={searchResult.product.imageUrl}
                                                alt={`สินค้า ${searchResult.product.id}`}
                                                className={styles.product_image}
                                            />
                                        )}

                                        {/* เพิ่มปุ่มแก้ไขและลบ */}
                                        <div className={styles.search_result_actions}>
                                            <button
                                                className={styles.edit_button}
                                                onClick={() => {
                                                    handleEdit(searchResult.product.docId);
                                                    handleCloseSearch();
                                                }}
                                                disabled={isDeleting}
                                            >
                                                <FaPenToSquare /> แก้ไข
                                            </button>
                                            <button
                                                className={styles.delete_button}
                                                onClick={() => {
                                                    handleDeleteClick(searchResult.product.docId);
                                                    handleCloseSearch();
                                                }}
                                                disabled={isDeleting}
                                            >
                                                <FaTrash /> ลบ
                                            </button>
                                            
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.product_not_found}>
                                        <h3>ไม่มีรหัสสินค้านี้ในระบบ</h3>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}

export default Order;