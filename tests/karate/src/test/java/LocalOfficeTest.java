package com.saikojin.localoffice;

import com.intuit.karate.junit5.Karate;

class LocalOfficeTest {

    @Karate.Test
    Karate testAll() {
        return Karate.run("classpath:features");
    }

    @Karate.Test
    Karate testSmoke() {
        return Karate.run("classpath:features/smoke.feature");
    }

    @Karate.Test
    Karate testWriter() {
        return Karate.run("classpath:features/writer.feature");
    }

    @Karate.Test
    Karate testSheets() {
        return Karate.run("classpath:features/sheets.feature");
    }

    @Karate.Test
    Karate testPdf() {
        return Karate.run("classpath:features/pdf.feature");
    }

    @Karate.Test
    Karate testShell() {
        return Karate.run("classpath:features/shell.feature");
    }
}
