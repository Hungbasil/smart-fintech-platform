package com.fintech.smartwealth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SmartWealthApplication {

	public static void main(String[] args) {
		SpringApplication.run(SmartWealthApplication.class, args);
	}

}
