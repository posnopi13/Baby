package com.babytime.app.data.database.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * 아기 상태 메모 테이블 (엄마가 자유롭게 기록)
 * 앱이 이 메모를 분석해 관리 포인트를 제안
 */
@Entity(
    tableName = "memos",
    foreignKeys = [
        ForeignKey(
            entity = BabyEntity::class,
            parentColumns = ["id"],
            childColumns = ["babyId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("babyId"), Index("recordedAt")]
)
data class MemoEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val babyId: Long,
    val content: String,
    val mood: String = "NORMAL",    // HAPPY, NORMAL, FUSSY, SICK
    val temperature: Double? = null, // 체온 (°C)
    val weight: Double? = null,      // 체중 (kg)
    val height: Double? = null,      // 키 (cm)
    val tags: String = "",           // 쉼표로 구분된 태그
    val recordedAt: Long = System.currentTimeMillis(),
    val createdAt: Long = System.currentTimeMillis()
)

object BabyMood {
    const val HAPPY = "HAPPY"
    const val NORMAL = "NORMAL"
    const val FUSSY = "FUSSY"
    const val SICK = "SICK"
}
