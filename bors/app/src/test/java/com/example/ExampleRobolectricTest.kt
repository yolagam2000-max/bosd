package com.example

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ExampleRobolectricTest {

  @Test
  fun verifyAppName() {
    val expectedName = "BoraScan"
    assertEquals("BoraScan", expectedName)
  }

  @Test
  fun verifyResultCategories() {
    val categories = listOf("0", "1", "2", "B+", "B-")
    assertEquals(5, categories.size)
    assertTrue(categories.contains("0"))
    assertTrue(categories.contains("1"))
    assertTrue(categories.contains("2"))
    assertTrue(categories.contains("B+"))
    assertTrue(categories.contains("B-"))
  }
}
