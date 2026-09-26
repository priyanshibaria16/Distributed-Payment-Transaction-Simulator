package com.simulator.payment.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

@Configuration
public class ThreadPoolConfig {

    private static final Logger log = LoggerFactory.getLogger(ThreadPoolConfig.class);

    @Value("${simulator.workers.core-pool-size:8}")
    private int corePoolSize;

    @Value("${simulator.workers.max-pool-size:16}")
    private int maxPoolSize;

    @Value("${simulator.workers.queue-capacity:500}")
    private int queueCapacity;

    @Value("${simulator.workers.keep-alive-seconds:60}")
    private long keepAliveSeconds;

    @Bean(name = "paymentThreadPoolExecutor", destroyMethod = "shutdown")
    public ThreadPoolExecutor paymentThreadPoolExecutor() {
        log.info("Initializing Core Java ThreadPoolExecutor: core={}, max={}, queueCapacity={}",
                corePoolSize, maxPoolSize, queueCapacity);

        BlockingQueue<Runnable> workQueue = new ArrayBlockingQueue<>(queueCapacity);

        ThreadFactory threadFactory = new ThreadFactory() {
            private final AtomicInteger threadNumber = new AtomicInteger(1);
            @Override
            public Thread newThread(Runnable r) {
                Thread t = new Thread(r, "payment-worker-" + threadNumber.getAndIncrement());
                t.setDaemon(false);
                t.setPriority(Thread.NORM_PRIORITY);
                return t;
            }
        };

        // CallerRunsPolicy provides backpressure to JMS listeners without dropping transactions
        RejectedExecutionHandler handler = new ThreadPoolExecutor.CallerRunsPolicy();

        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                corePoolSize,
                maxPoolSize,
                keepAliveSeconds,
                TimeUnit.SECONDS,
                workQueue,
                threadFactory,
                handler
        );

        // Allow core threads to timeout if idle for long periods
        executor.allowCoreThreadTimeOut(true);

        return executor;
    }
}
