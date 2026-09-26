package com.simulator.payment;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

import static org.junit.jupiter.api.Assertions.*;

class PaymentConcurrencyTest {

    static class SimulatedAccount {
        private final long id;
        private BigDecimal balance;
        private final ReentrantLock lock = new ReentrantLock();

        public SimulatedAccount(long id, BigDecimal balance) {
            this.id = id;
            this.balance = balance;
        }

        public boolean debit(BigDecimal amount) {
            lock.lock();
            try {
                if (balance.compareTo(amount) >= 0) {
                    balance = balance.subtract(amount);
                    return true;
                }
                return false;
            } finally {
                lock.unlock();
            }
        }

        public BigDecimal getBalance() {
            lock.lock();
            try {
                return balance;
            } finally {
                lock.unlock();
            }
        }
    }

    @Test
    @DisplayName("Verify race condition avoidance: Initial balance ₹1,000, concurrent ₹700 and ₹600 payments")
    void testConcurrentDebitIntegrity() throws InterruptedException {
        SimulatedAccount account = new SimulatedAccount(1L, new BigDecimal("1000.00"));

        BigDecimal paymentA = new BigDecimal("700.00");
        BigDecimal paymentB = new BigDecimal("600.00");

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        // Task A: Debit ₹700
        executor.submit(() -> {
            try {
                startLatch.await(); // Synchronize thread start
                boolean success = account.debit(paymentA);
                if (success) {
                    successCount.incrementAndGet();
                } else {
                    failureCount.incrementAndGet();
                }
            } catch (Exception e) {
                failureCount.incrementAndGet();
            } finally {
                finishLatch.countDown();
            }
        });

        // Task B: Debit ₹600
        executor.submit(() -> {
            try {
                startLatch.await(); // Synchronize thread start
                boolean success = account.debit(paymentB);
                if (success) {
                    successCount.incrementAndGet();
                } else {
                    failureCount.incrementAndGet();
                }
            } catch (Exception e) {
                failureCount.incrementAndGet();
            } finally {
                finishLatch.countDown();
            }
        });

        // Fire both tasks simultaneously
        startLatch.countDown();
        boolean completed = finishLatch.await(5, TimeUnit.SECONDS);

        assertTrue(completed, "Concurrency test timed out");
        assertEquals(1, successCount.get(), "Exactly one concurrent payment must succeed");
        assertEquals(1, failureCount.get(), "Exactly one concurrent payment must be rejected");

        BigDecimal finalBalance = account.getBalance();
        assertTrue(finalBalance.compareTo(BigDecimal.ZERO) >= 0, "Account balance must never be negative");

        // The final balance must be either 300 (1000 - 700) or 400 (1000 - 600)
        boolean isExpectedRemaining = finalBalance.compareTo(new BigDecimal("300.00")) == 0 ||
                                      finalBalance.compareTo(new BigDecimal("400.00")) == 0;
        assertTrue(isExpectedRemaining, "Final balance must be exactly ₹300.00 or ₹400.00, but was: " + finalBalance);

        executor.shutdown();
    }
}
