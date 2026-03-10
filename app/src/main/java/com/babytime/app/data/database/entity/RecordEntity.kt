package com.babytime.app.data.database.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * 아기 생활패턴 기록 테이블
 */
@Entity(
    tableName = "records",
    foreignKeys = [
        ForeignKey(
            entity = BabyEntity::class,
            parentColumns = ["id"],
            childColumns = ["babyId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = PatternEntity::class,
            parentColumns = ["id"],
            childColumns = ["patternId"],
            onDelete = ForeignKey.RESTRICT
        )
    ],
    indices = [
        Index("babyId"),
        Index("patternId"),
        Index("startTime")
    ]
)
data class RecordEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val babyId: Long,
    val patternId: Long,
    val startTime: Long,            // 기록 시작 시간 (timestamp)
    val endTime: Long? = null,      // 기록 종료 시간 (수면 등 duration이 있는 경우)
    val amount: Double? = null,     // 양 (분유 ml 등)
    val note: String = "",          // 메모
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
