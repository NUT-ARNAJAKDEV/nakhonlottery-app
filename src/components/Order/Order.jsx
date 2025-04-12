import React, { useState, useEffect } from 'react';
import styles from './Order.module.css';
import { FaEyeLowVision, FaSistrix } from 'react-icons/fa6';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';

function Order() {
    const [orderList, setOrderList] = useState([]);
    const [showAllProducts] = useState(false);
    const [displayCount] = useState(4);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchInputs, setSearchInputs] = useState(['', '', '', '', '', '']);
    const [searchResult, setSearchResult] = useState(null);

    // Fetch products from Firestore
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

                return () => unsubscribe();
            } catch (error) {
                console.error('Error fetching orders: ', error);
            }
        };

        fetchOrders();
    }, []);

    // Calculate products to display
    const displayedProducts = showAllProducts ? orderList : orderList.slice(0, displayCount);

    const handleCloseSearch = () => {
        setIsSearchOpen(false);
    };

    const handleSearchInputChange = (index, value) => {
        if (!/^[0-9]?$/.test(value)) return;

        const newInputs = [...searchInputs];
        newInputs[index] = value;
        setSearchInputs(newInputs);

        if (value && index < 5) {
            const nextInput = document.getElementById(`search-input-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleSearchProduct = () => {
        const productId = searchInputs.join('');
        if (productId.length !== 6) {
            alert('กรุณากรอกรหัสสินค้า 6 หลักให้ครบถ้วน');
            return;
        }

        const foundProduct = orderList.find(product => product.id === productId);
        
        if (foundProduct) {
            setSearchResult({
                found: true,
                product: foundProduct
            });
        } else {
            setSearchResult({ found: false });
        }
    };

    const handleRandomProduct = () => {
        if (orderList.length === 0) {
            alert('ไม่มีสินค้าในระบบ');
            return;
        }

        const randomIndex = Math.floor(Math.random() * orderList.length);
        const randomProduct = orderList[randomIndex];

        setSearchResult({
            found: true,
            product: randomProduct
        });
    };

    return (
        <div className={styles.order_con}>
            <div className={styles.title_con}>
                <h1>รายการสินค้า</h1>
                <div className={styles.btn_order}>
                    <button
                        className={styles.toggle_button}
                        disabled={orderList.length <= displayCount}
                    >
                        <FaEyeLowVision />
                    </button>
                    <button
                        className={styles.sistrix}
                    >
                        <FaSistrix />
                    </button>
                </div>
            </div>

            {/* Product list */}
            <div className={styles.order_list}>
                {displayedProducts.map((order) => (
                    <div key={order.docId} className={styles.order_items}>
                        <div className={styles.order_info}>
                            <p className={styles.product_id}>รหัสสินค้า: {order.id}</p>
                            <p>จำนวน: {order.amount}</p>
                        </div>
                        <div className={styles.order_img}>
                            {order.imageUrl && (
                                <img src={order.imageUrl} alt={`สินค้า ${order.id}`} />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Search modal */}
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