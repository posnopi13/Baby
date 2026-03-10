package com.babytime.app.data.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * 패턴 정의 테이블
 * 기본 패턴 + 사용자 정의 패턴을 모두 저장
 */
@Entity(tableName = "patterns")
data class PatternEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,           // 패턴 이름 (예: 분유, 수면)
    val category: String,       // FOOD, SLEEP, DIAPER, MEDICATION, CUSTOM
    val subType: String = "",   // 세부 타입 (예: NIGHT_SLEEP, NAP, POOP, PEE)
    val iconName: String = "",  // Material Icon 이름
    val colorHex: String = "#FF6B9D", // 표시 색상
    val isDefault: Boolean = true,    // 기본 패턴 여부
    val isActive: Boolean = true,     // 활성화 여부
    val displayOrder: Int = 0,        // 표시 순서
    val hasAmount: Boolean = false,   // 양 입력 필요 여부 (분유 ml 등)
    val amountUnit: String = "",      // 단위 (ml, g 등)
    val createdAt: Long = System.currentTimeMillis()
)

object PatternCategory {
    const val FOOD = "FOOD"
    const val SLEEP = "SLEEP"
    const val DIAPER = "DIAPER"
    const val MEDICATION = "MEDICATION"
    const val CUSTOM = "CUSTOM"
}

object PatternSubType {
    // Food
    const val FORMULA = "FORMULA"       // 분유
    const val BABY_FOOD = "BABY_FOOD"   // 이유식
    const val TODDLER_FOOD = "TODDLER_FOOD" // 유아식
    const val BREAST_MILK = "BREAST_MILK"   // 모유

    // Sleep
    const val NIGHT_SLEEP = "NIGHT_SLEEP"   // 밤잠
    const val NAP = "NAP"                   // 낮잠

    // Diaper
    const val POOP = "POOP"     // 대변
    const val PEE = "PEE"       // 소변
    const val MIXED = "MIXED"   // 대소변 동시

    // Medication
    const val MEDICATION = "MEDICATION"
}
