import client.LoginCrypto;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/** Synthetic local integration input only; never connects to a game server. */
public class RegistrationPasswordProbe {
    public static void main(String[] args) throws Exception {
        String input = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);
        String password = value(input, "password");
        String hash = value(input, "hash");
        String salt = value(input, "salt");
        if (!LoginCrypto.checkSaltedSha512Hash(hash, password, salt)) throw new Exception("Compatibility failed");
        if (LoginCrypto.checkSaltedSha512Hash(hash, password + "wrong", salt)) throw new Exception("Negative check failed");
        System.out.println("NATIVE_PASSWORD_COMPATIBLE");
    }
    private static String value(String input, String key) throws Exception {
        var match = Pattern.compile("\"" + key + "\":\"([^\"\\\\]*)\"").matcher(input);
        if (!match.find()) throw new Exception("Invalid synthetic input");
        return match.group(1);
    }
}
