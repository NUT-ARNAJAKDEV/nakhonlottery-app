import React from 'react';
import styles from './More.module.css';

function More() {
  return (
    <div className={styles.info_wrapper}>
      <div className={styles.info_con}>
        <div className={styles.title}>
          {/* ส่วนหัวเรื่องข่าวสารและกิจกรรม */}
          <div className={styles.info_line}>
            <h3 className={styles.info_title}>ข่าวสารและกิจกรรม</h3>
          </div>
          {/* ปุ่ม "ดูเพิ่มเติม" */}
          <div className={styles.see_more}>
            <a href="https://www.thairath.co.th/home" target='blank' className={styles.info_more_button}>ดูทั้งหมด</a>
          </div>
        </div>
        <div className={styles.info_list}>
          <div className={styles.info_items}>
            <div className={styles.info_img}>
              <img src="https://static.thairath.co.th/media/dFQROr7oWzulq5Fa6rV155wd5Marm2reiiON2Kje1LMudcXmhW4byhak4X4N3KNdhVw.webp" alt="" />
            </div>
            <div className={styles.info_detail}>
              <div className={styles.info_amount}>
                <p>โปรดเกล้าฯ แต่งตั้ง “บิ๊กอ๊อด-บิ๊กแมว-บิ๊กต่าย” เป็นนายทหาร-นายตำรวจราชองครักษ์ในพระองค์</p>
              </div>
              <div className={styles.info_actions}>
                <a href="https://www.thairath.co.th/news/politic/2852638" target="_blank" className={styles.info_buttom}>อ่านต่อ.</a>
                <p className={styles.info_date}>11 เม.ย. 2568</p>
              </div>
            </div>
          </div>

          <div className={styles.info_items}>
            <div className={styles.info_img}>
              <img src="https://static.thairath.co.th/media/dFQROr7oWzulq5Fa6rV155wTdHLwAzVerRmAvjeHF8v7VEWxiFsPO1l47gBxp0pDlhd.webp" alt="" />
            </div>
            <div className={styles.info_detail}>
              <div className={styles.info_amount}>
                <p>“พีระพันธุ์” เผย รทสช. รับได้ ไม่มีปัญหา กม.เอ็นเตอร์เทนเมนต์ฯ หลังแก้ไขแล้ว</p>
              </div>
              <div className={styles.info_actions}>
                <a href="https://www.thairath.co.th/news/politic/2852633" target="_blank" className={styles.info_buttom}>อ่านต่อ.</a>
                <p className={styles.info_date}>11 เม.ย. 2568</p>
              </div>
            </div>
          </div>

          <div className={styles.info_items}>
            <div className={styles.info_img}>
              <img src="https://static.thairath.co.th/media/dFQROr7oWzulq5Fa6rV155rweLLFEF6T5e5TGDNLH9irqtq7fcjtgsmZrKAmwrhQiiC.webp" alt="" />
            </div>
            <div className={styles.info_detail}>
              <div className={styles.info_amount}>
                <p>พรรคกล้าธรรม ลุยเปิดสาขาภาคเหนือ-อีสาน “ธรรมนัส” ลั่นพร้อมสู้ศึกเลือกตั้ง</p>
              </div>
              <div className={styles.info_actions}>
                <a href="https://www.thairath.co.th/news/politic/2852626" target="_blank" className={styles.info_buttom}>อ่านต่อ.</a>
                <p className={styles.info_date}>11 เม.ย. 2568</p>
              </div>
            </div>
          </div>

          <div className={styles.info_items}>
            <div className={styles.info_img}>
              <img src="https://static.thairath.co.th/media/dFQROr7oWzulq5Fa6rV155rx5NlQ7OBOI1c43mMgb8M5eCiAc83kbAEbKZm15wMkVd4.webp" alt="" />
            </div>
            <div className={styles.info_detail}>
              <div className={styles.info_amount}>
                <p>เบี้ยยังชีพผู้สูงอายุ เงินคนแก่ เดือนเมษายน 68 เข้าบัญชีแล้ว</p>
              </div>
              <div className={styles.info_actions}>
                <a href="https://www.thairath.co.th/news/society/2852625" target="_blank" className={styles.info_buttom}>อ่านต่อ.</a>
                <p className={styles.info_date}>11 เม.ย. 2568</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default More;