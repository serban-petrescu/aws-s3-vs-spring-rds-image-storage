package ro.msg.poc.images;

import com.amazonaws.auth.PEM;
import com.amazonaws.services.cloudfront.CloudFrontUrlSigner;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import db.migration.V2__Insert_images;
import lombok.RequiredArgsConstructor;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.stereotype.Repository;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import ro.msg.poc.images.db.Tables;
import ro.msg.poc.images.db.tables.records.ImageRecord;

import java.security.PrivateKey;
import java.security.Security;
import java.sql.Date;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@SpringBootApplication
public class ImagesApplication {

    public static void main(String[] args) {
        Security.addProvider(new BouncyCastleProvider());
        SpringApplication.run(ImagesApplication.class, args);
    }

    @Bean
    public S3UrlSigner s3Signer(@Value("${ro.msg.poc.bucket}") String bucket) {
        return new S3UrlSigner(AmazonS3ClientBuilder.defaultClient(), bucket);
    }

    @Bean
    public CfUrlSigner cfSigner(@Value("${ro.msg.poc.distDomain}") String domain,
                                @Value("${ro.msg.poc.keyId}") String keyId) throws Exception {
        return new CfUrlSigner(domain, keyId, PEM.readPrivateKey(Objects.requireNonNull(this.getClass().getResourceAsStream("/private.pem"))));
    }

}

@Repository
@RequiredArgsConstructor
class ImagesRepository {
    private final DSLContext create;

    public Optional<ImageRecord> findImageById(String id) {
        return create.selectFrom(Tables.IMAGE)
                .where(Tables.IMAGE.ID.equal(id))
                .fetchOptional();
    }
}

@RequiredArgsConstructor
class CfUrlSigner {
    private final String domain;
    private final String keyId;
    private final PrivateKey key;

    String sign(String id) {
        return CloudFrontUrlSigner.getSignedURLWithCannedPolicy(
                "https://" + domain + "/" + id,
                keyId,
                key,
                Date.valueOf(LocalDate.now().plusDays(1))
        );
    }
}

@RequiredArgsConstructor
class S3UrlSigner {
    private final AmazonS3 client;
    private final String bucket;

    String sign(String id) {
        return client.generatePresignedUrl(bucket, id, Date.valueOf(LocalDate.now().plusDays(1))).toExternalForm();
    }
}

@RestController
@RequiredArgsConstructor
class ImagesController {
    private final ImagesRepository repository;
    private final S3UrlSigner s3UrlSigner;
    private final CfUrlSigner cfUrlSigner;

    @GetMapping("/image/{id}")
    public ResponseEntity<byte[]> image(@PathVariable String id) {
        var record = repository.findImageById(id).orElseThrow();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(record.getMime()))
                .body(record.getBody());
    }

    @GetMapping("/s3/{id}")
    public ResponseEntity<String> s3(@PathVariable String id) {
        return ResponseEntity.status(302)
                .header("Location", s3UrlSigner.sign(id))
                .body("");
    }

    @GetMapping("/cf/{id}")
    public ResponseEntity<String> cf(@PathVariable String id) {
        return ResponseEntity.status(302)
                .header("Location", cfUrlSigner.sign(id))
                .body("");
    }
}

@Controller
@RequiredArgsConstructor
class PageController {
    private final S3UrlSigner s3UrlSigner;
    private final CfUrlSigner cfUrlSigner;

    @GetMapping("/database")
    public String database(Model model) {
        model.addAttribute("images", Arrays.asList(V2__Insert_images.IMAGES));
        model.addAttribute("title", "Database");
        return "index";
    }

    @GetMapping("/s3-indirect")
    public String s3Indirect(Model model) {
        model.addAttribute("images", Arrays.stream(V2__Insert_images.IMAGES)
                .map(id -> "/s3/" + id)
                .collect(Collectors.toList()));
        model.addAttribute("title", "S3: Indirect");
        return "index";
    }

    @GetMapping("/s3-direct")
    public String s3Direct(Model model) {
        model.addAttribute("images", Arrays.stream(V2__Insert_images.IMAGES)
                .map(s3UrlSigner::sign)
                .collect(Collectors.toList()));
        model.addAttribute("title", "S3: Direct");
        return "index";
    }

    @GetMapping("/cf-indirect")
    public String cfIndirect(Model model) {
        model.addAttribute("images", Arrays.stream(V2__Insert_images.IMAGES)
                .map(id -> "/cf/" + id)
                .collect(Collectors.toList()));
        model.addAttribute("title", "CF: Indirect");
        return "index";
    }

    @GetMapping("/cf-direct")
    public String cfDirect(Model model) {
        model.addAttribute("images", Arrays.stream(V2__Insert_images.IMAGES)
                .map(cfUrlSigner::sign)
                .collect(Collectors.toList()));
        model.addAttribute("title", "CF: Direct");
        return "index";
    }
}
